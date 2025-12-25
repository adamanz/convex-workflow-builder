import { v } from "convex/values";
import { mutation, query, action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// Query to get executions for a workflow
export const listByWorkflow = query({
  args: { workflowId: v.id("workflows") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("executions")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId))
      .order("desc")
      .take(50);
  },
});

// Query to get a single execution
export const get = query({
  args: { id: v.id("executions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Query to get recent executions across all workflows
export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    return await ctx.db
      .query("executions")
      .withIndex("by_started")
      .order("desc")
      .take(limit);
  },
});

// Query to get execution logs
export const getLogs = query({
  args: { executionId: v.id("executions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("executionLogs")
      .withIndex("by_execution_timestamp", (q) =>
        q.eq("executionId", args.executionId)
      )
      .order("asc")
      .collect();
  },
});

// Start a new workflow execution
export const start = mutation({
  args: {
    workflowId: v.id("workflows"),
    input: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow) throw new Error("Workflow not found");

    const executionId = await ctx.db.insert("executions", {
      workflowId: args.workflowId,
      convexWorkflowId: "",
      status: "pending",
      input: args.input ?? {},
      startedAt: Date.now(),
      stepResults: [],
    });

    // Log the start
    await ctx.db.insert("executionLogs", {
      executionId,
      timestamp: Date.now(),
      level: "info",
      message: `Workflow "${workflow.name}" execution started`,
    });

    return executionId;
  },
});

// Update execution status
export const updateStatus = internalMutation({
  args: {
    executionId: v.id("executions"),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    error: v.optional(v.string()),
    output: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = { status: args.status };

    if (args.error) updates.error = args.error;
    if (args.output) updates.output = args.output;
    if (args.status === "completed" || args.status === "failed") {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(args.executionId, updates);
  },
});

// Update current step
export const updateCurrentStep = internalMutation({
  args: {
    executionId: v.id("executions"),
    stepId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.executionId, {
      currentStep: args.stepId,
    });
  },
});

// Add step result
export const addStepResult = internalMutation({
  args: {
    executionId: v.id("executions"),
    result: v.object({
      nodeId: v.string(),
      nodeName: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("running"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("skipped")
      ),
      input: v.optional(v.any()),
      output: v.optional(v.any()),
      error: v.optional(v.string()),
      startedAt: v.number(),
      completedAt: v.optional(v.number()),
      duration: v.optional(v.number()),
      retryCount: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution) throw new Error("Execution not found");

    // Update existing step or add new one
    const existingIdx = execution.stepResults.findIndex(
      (s) => s.nodeId === args.result.nodeId
    );

    let updatedResults;
    if (existingIdx >= 0) {
      updatedResults = [...execution.stepResults];
      updatedResults[existingIdx] = args.result;
    } else {
      updatedResults = [...execution.stepResults, args.result];
    }

    await ctx.db.patch(args.executionId, {
      stepResults: updatedResults,
    });
  },
});

// Add execution log
export const addLog = internalMutation({
  args: {
    executionId: v.id("executions"),
    level: v.union(
      v.literal("debug"),
      v.literal("info"),
      v.literal("warn"),
      v.literal("error")
    ),
    message: v.string(),
    nodeId: v.optional(v.string()),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("executionLogs", {
      executionId: args.executionId,
      timestamp: Date.now(),
      level: args.level,
      message: args.message,
      nodeId: args.nodeId,
      data: args.data,
    });
  },
});

// Cancel an execution
export const cancel = mutation({
  args: { executionId: v.id("executions") },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution) throw new Error("Execution not found");

    if (execution.status !== "pending" && execution.status !== "running") {
      throw new Error("Can only cancel pending or running executions");
    }

    await ctx.db.patch(args.executionId, {
      status: "cancelled",
      completedAt: Date.now(),
    });

    await ctx.db.insert("executionLogs", {
      executionId: args.executionId,
      timestamp: Date.now(),
      level: "warn",
      message: "Execution cancelled by user",
    });
  },
});

// Action to execute a workflow step (HTTP action example)
export const executeHttpAction = action({
  args: {
    url: v.string(),
    method: v.union(
      v.literal("GET"),
      v.literal("POST"),
      v.literal("PUT"),
      v.literal("DELETE"),
      v.literal("PATCH")
    ),
    headers: v.optional(v.record(v.string(), v.string())),
    body: v.optional(v.string()),
    executionId: v.id("executions"),
    nodeId: v.string(),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();

    try {
      const response = await fetch(args.url, {
        method: args.method,
        headers: args.headers,
        body: args.body,
      });

      const data = await response.text();
      let parsedData;
      try {
        parsedData = JSON.parse(data);
      } catch {
        parsedData = data;
      }

      await ctx.runMutation(internal.executions.addLog, {
        executionId: args.executionId,
        level: "info",
        message: `HTTP ${args.method} to ${args.url} returned ${response.status}`,
        nodeId: args.nodeId,
        data: { status: response.status, body: parsedData },
      });

      return {
        success: response.ok,
        status: response.status,
        data: parsedData,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await ctx.runMutation(internal.executions.addLog, {
        executionId: args.executionId,
        level: "error",
        message: `HTTP request failed: ${errorMessage}`,
        nodeId: args.nodeId,
      });

      return {
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime,
      };
    }
  },
});
