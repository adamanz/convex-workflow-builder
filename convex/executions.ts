/**
 * Workflow Execution Management
 *
 * Handles workflow execution lifecycle:
 * - Start new executions
 * - Cancel running executions
 * - List and query executions
 * - Real-time status tracking
 * - Log streaming
 */
import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { workflowManager } from "./index";

/**
 * Start a workflow execution
 *
 * Creates an execution record and starts the workflow engine
 *
 * @param workflowId - ID of the workflow to execute
 * @param input - Input data for the workflow
 * @returns Execution ID for tracking
 */
export const executeWorkflow = mutation({
  args: {
    workflowId: v.id("workflows"),
    input: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Get the workflow definition
    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${args.workflowId} not found`);
    }

    const now = Date.now();

    // Create execution record
    const executionId = await ctx.db.insert("workflowExecutions", {
      workflowId: args.workflowId,
      status: "pending",
      input: args.input ?? {},
      startedAt: now,
      stepResults: [],
      retryCount: 0,
    });

    // Log execution start
    await ctx.db.insert("executionLogs", {
      executionId,
      level: "info",
      message: `Starting workflow execution: ${workflow.name}`,
      data: { input: args.input },
      timestamp: now,
    });

    // Schedule the workflow engine to run
    await ctx.scheduler.runAfter(0, internal.engine.runWorkflow, {
      executionId,
      workflowId: args.workflowId,
    });

    return executionId;
  },
});

/**
 * Cancel a running execution
 *
 * @param executionId - ID of the execution to cancel
 */
export const cancelExecution = mutation({
  args: {
    executionId: v.id("workflowExecutions"),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution) {
      throw new Error(`Execution ${args.executionId} not found`);
    }

    if (execution.status !== "running" && execution.status !== "pending") {
      throw new Error(
        `Cannot cancel execution in ${execution.status} status`
      );
    }

    const now = Date.now();

    // Update execution status
    await ctx.db.patch(args.executionId, {
      status: "cancelled",
      completedAt: now,
    });

    // Log cancellation
    await ctx.db.insert("executionLogs", {
      executionId: args.executionId,
      level: "warn",
      message: "Execution cancelled by user",
      timestamp: now,
    });

    // If there's a convex workflow ID, try to cancel it
    if (execution.convexWorkflowId) {
      try {
        await workflowManager.cancel(ctx, execution.convexWorkflowId as Id<"_storage">);
      } catch (error) {
        // Workflow may already be complete
        console.log("Could not cancel underlying workflow:", error);
      }
    }

    return { success: true };
  },
});

/**
 * List executions for a workflow
 *
 * @param workflowId - Optional workflow ID filter
 * @param status - Optional status filter
 * @param limit - Number of executions to return
 * @returns Array of executions
 */
export const listExecutions = query({
  args: {
    workflowId: v.optional(v.id("workflows")),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("running"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("cancelled")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    let executionsQuery;

    if (args.workflowId && args.status) {
      executionsQuery = ctx.db
        .query("workflowExecutions")
        .withIndex("by_workflow_and_status", (q) =>
          q.eq("workflowId", args.workflowId!).eq("status", args.status!)
        );
    } else if (args.workflowId) {
      executionsQuery = ctx.db
        .query("workflowExecutions")
        .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId!));
    } else if (args.status) {
      executionsQuery = ctx.db
        .query("workflowExecutions")
        .withIndex("by_status", (q) => q.eq("status", args.status!));
    } else {
      executionsQuery = ctx.db
        .query("workflowExecutions")
        .withIndex("by_started");
    }

    const executions = await executionsQuery.order("desc").take(limit);

    // Enrich with workflow names
    const enrichedExecutions = await Promise.all(
      executions.map(async (execution) => {
        const workflow = await ctx.db.get(execution.workflowId);
        return {
          ...execution,
          workflowName: workflow?.name ?? "Unknown",
        };
      })
    );

    return enrichedExecutions;
  },
});

/**
 * Get a single execution with real-time status
 *
 * This query is designed for real-time subscriptions
 *
 * @param id - Execution ID
 * @returns Execution with full details
 */
export const getExecution = query({
  args: {
    id: v.id("workflowExecutions"),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.id);
    if (!execution) {
      return null;
    }

    // Get workflow details
    const workflow = await ctx.db.get(execution.workflowId);

    // Get recent logs
    const recentLogs = await ctx.db
      .query("executionLogs")
      .withIndex("by_execution", (q) => q.eq("executionId", args.id))
      .order("desc")
      .take(50);

    return {
      ...execution,
      workflow: workflow
        ? {
            _id: workflow._id,
            name: workflow.name,
            nodes: workflow.nodes,
            edges: workflow.edges,
          }
        : null,
      recentLogs: recentLogs.reverse(), // Return in chronological order
    };
  },
});

/**
 * Get execution logs with pagination
 *
 * Supports real-time log streaming via subscriptions
 *
 * @param executionId - Execution ID
 * @param nodeId - Optional filter by node
 * @param level - Optional filter by log level
 * @param limit - Number of logs to return
 * @param cursor - Pagination cursor (timestamp)
 */
export const getExecutionLogs = query({
  args: {
    executionId: v.id("workflowExecutions"),
    nodeId: v.optional(v.string()),
    level: v.optional(
      v.union(
        v.literal("debug"),
        v.literal("info"),
        v.literal("warn"),
        v.literal("error")
      )
    ),
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    let logsQuery;

    if (args.nodeId) {
      logsQuery = ctx.db
        .query("executionLogs")
        .withIndex("by_execution_and_node", (q) =>
          q.eq("executionId", args.executionId).eq("nodeId", args.nodeId!)
        );
    } else {
      logsQuery = ctx.db
        .query("executionLogs")
        .withIndex("by_execution", (q) => q.eq("executionId", args.executionId));
    }

    let logs = await logsQuery.order("desc").take(limit);

    // Apply level filter if specified
    if (args.level) {
      logs = logs.filter((log) => log.level === args.level);
    }

    // Apply cursor filter if specified
    if (args.cursor) {
      logs = logs.filter((log) => log.timestamp > args.cursor!);
    }

    return logs.reverse(); // Return in chronological order
  },
});

/**
 * Internal mutation to update execution status
 *
 * Called by the workflow engine during execution
 */
export const updateExecutionStatus = internalMutation({
  args: {
    executionId: v.id("workflowExecutions"),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    currentStep: v.optional(v.string()),
    output: v.optional(v.any()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { executionId, ...updates } = args;

    const updateData: Record<string, unknown> = { ...updates };

    // Set completedAt if execution is finished
    if (["completed", "failed", "cancelled"].includes(args.status)) {
      updateData.completedAt = Date.now();
    }

    await ctx.db.patch(executionId, updateData);
  },
});

/**
 * Internal mutation to update step result
 *
 * Called by the workflow engine when a step completes
 */
export const updateStepResult = internalMutation({
  args: {
    executionId: v.id("workflowExecutions"),
    nodeId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("skipped")
    ),
    output: v.optional(v.any()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution) {
      throw new Error(`Execution ${args.executionId} not found`);
    }

    const now = Date.now();

    // Find existing step result or create new one
    const existingResults = [...execution.stepResults];
    const existingIndex = existingResults.findIndex(
      (r) => r.nodeId === args.nodeId
    );

    const stepResult = {
      nodeId: args.nodeId,
      status: args.status,
      output: args.output,
      error: args.error,
      startedAt:
        existingIndex >= 0
          ? existingResults[existingIndex].startedAt
          : now,
      completedAt: ["completed", "failed", "skipped"].includes(args.status)
        ? now
        : undefined,
    };

    if (existingIndex >= 0) {
      existingResults[existingIndex] = stepResult;
    } else {
      existingResults.push(stepResult);
    }

    await ctx.db.patch(args.executionId, {
      stepResults: existingResults,
      currentStep: args.status === "running" ? args.nodeId : execution.currentStep,
    });

    // Log step status change
    await ctx.db.insert("executionLogs", {
      executionId: args.executionId,
      nodeId: args.nodeId,
      level: args.status === "failed" ? "error" : "info",
      message: `Step ${args.nodeId}: ${args.status}`,
      data: args.status === "failed" ? { error: args.error } : { output: args.output },
      timestamp: now,
    });
  },
});

/**
 * Internal mutation to add execution log
 */
export const addExecutionLog = internalMutation({
  args: {
    executionId: v.id("workflowExecutions"),
    nodeId: v.optional(v.string()),
    level: v.union(
      v.literal("debug"),
      v.literal("info"),
      v.literal("warn"),
      v.literal("error")
    ),
    message: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("executionLogs", {
      executionId: args.executionId,
      nodeId: args.nodeId,
      level: args.level,
      message: args.message,
      data: args.data,
      timestamp: Date.now(),
    });
  },
});

/**
 * Retry a failed execution
 *
 * @param executionId - ID of the failed execution
 * @returns New execution ID
 */
export const retryExecution = mutation({
  args: {
    executionId: v.id("workflowExecutions"),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution) {
      throw new Error(`Execution ${args.executionId} not found`);
    }

    if (execution.status !== "failed") {
      throw new Error("Can only retry failed executions");
    }

    const now = Date.now();

    // Create new execution with incremented retry count
    const newExecutionId = await ctx.db.insert("workflowExecutions", {
      workflowId: execution.workflowId,
      status: "pending",
      input: execution.input,
      startedAt: now,
      stepResults: [],
      retryCount: execution.retryCount + 1,
    });

    // Log retry
    await ctx.db.insert("executionLogs", {
      executionId: newExecutionId,
      level: "info",
      message: `Retrying execution (attempt ${execution.retryCount + 2})`,
      data: { previousExecutionId: args.executionId },
      timestamp: now,
    });

    // Schedule the workflow engine
    await ctx.scheduler.runAfter(0, internal.engine.runWorkflow, {
      executionId: newExecutionId,
      workflowId: execution.workflowId,
    });

    return newExecutionId;
  },
});

/**
 * Get execution statistics for a workflow
 */
export const getExecutionStats = query({
  args: {
    workflowId: v.optional(v.id("workflows")),
    timeRangeMs: v.optional(v.number()), // e.g., 24 * 60 * 60 * 1000 for last 24 hours
  },
  handler: async (ctx, args) => {
    const cutoffTime = args.timeRangeMs
      ? Date.now() - args.timeRangeMs
      : 0;

    let executionsQuery;

    if (args.workflowId) {
      executionsQuery = ctx.db
        .query("workflowExecutions")
        .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId!));
    } else {
      executionsQuery = ctx.db.query("workflowExecutions");
    }

    const executions = await executionsQuery
      .filter((q) => q.gte(q.field("startedAt"), cutoffTime))
      .collect();

    const stats = {
      total: executions.length,
      pending: executions.filter((e) => e.status === "pending").length,
      running: executions.filter((e) => e.status === "running").length,
      completed: executions.filter((e) => e.status === "completed").length,
      failed: executions.filter((e) => e.status === "failed").length,
      cancelled: executions.filter((e) => e.status === "cancelled").length,
      averageDurationMs: 0,
      successRate: 0,
    };

    // Calculate average duration for completed executions
    const completedExecutions = executions.filter(
      (e) => e.status === "completed" && e.completedAt
    );
    if (completedExecutions.length > 0) {
      const totalDuration = completedExecutions.reduce(
        (sum, e) => sum + (e.completedAt! - e.startedAt),
        0
      );
      stats.averageDurationMs = Math.round(
        totalDuration / completedExecutions.length
      );
    }

    // Calculate success rate
    const finishedExecutions = executions.filter((e) =>
      ["completed", "failed"].includes(e.status)
    );
    if (finishedExecutions.length > 0) {
      stats.successRate = Math.round(
        (stats.completed / finishedExecutions.length) * 100
      );
    }

    return stats;
  },
});
