/**
 * Workflow CRUD Operations
 *
 * Provides mutations and queries for managing workflow definitions:
 * - Create new workflows
 * - Update workflow definitions (nodes, edges, metadata)
 * - Delete workflows
 * - List workflows with filtering
 * - Get individual workflow details
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Node validator (matching schema)
const nodeValidator = v.object({
  id: v.string(),
  type: v.union(
    v.literal("start"),
    v.literal("end"),
    v.literal("action"),
    v.literal("mutation"),
    v.literal("query"),
    v.literal("condition"),
    v.literal("delay"),
    v.literal("parallel"),
    v.literal("loop"),
    v.literal("ai"),
    v.literal("http"),
    v.literal("transform")
  ),
  position: v.object({ x: v.number(), y: v.number() }),
  data: v.object({
    label: v.string(),
    config: v.any(),
  }),
});

// Edge validator (matching schema)
const edgeValidator = v.object({
  id: v.string(),
  source: v.string(),
  target: v.string(),
  sourceHandle: v.optional(v.string()),
  targetHandle: v.optional(v.string()),
  label: v.optional(v.string()),
});

/**
 * Create a new workflow
 *
 * @param name - Workflow name
 * @param description - Optional description
 * @param nodes - Array of node definitions
 * @param edges - Array of edge connections
 * @returns The ID of the created workflow
 */
export const createWorkflow = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    nodes: v.optional(v.array(nodeValidator)),
    edges: v.optional(v.array(edgeValidator)),
    inputSchema: v.optional(v.any()),
    outputSchema: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Create default start and end nodes if no nodes provided
    const defaultNodes = args.nodes ?? [
      {
        id: "start-1",
        type: "start" as const,
        position: { x: 250, y: 50 },
        data: { label: "Start", config: {} },
      },
      {
        id: "end-1",
        type: "end" as const,
        position: { x: 250, y: 350 },
        data: { label: "End", config: {} },
      },
    ];

    const workflowId = await ctx.db.insert("workflows", {
      name: args.name,
      description: args.description,
      nodes: defaultNodes,
      edges: args.edges ?? [],
      status: "draft",
      inputSchema: args.inputSchema,
      outputSchema: args.outputSchema,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });

    return workflowId;
  },
});

/**
 * Update an existing workflow
 *
 * @param id - Workflow ID to update
 * @param updates - Partial workflow data to update
 * @returns The updated workflow
 */
export const updateWorkflow = mutation({
  args: {
    id: v.id("workflows"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    nodes: v.optional(v.array(nodeValidator)),
    edges: v.optional(v.array(edgeValidator)),
    status: v.optional(
      v.union(v.literal("draft"), v.literal("published"), v.literal("archived"))
    ),
    inputSchema: v.optional(v.any()),
    outputSchema: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    // Get existing workflow
    const workflow = await ctx.db.get(id);
    if (!workflow) {
      throw new Error(`Workflow ${id} not found`);
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.nodes !== undefined) updateData.nodes = updates.nodes;
    if (updates.edges !== undefined) updateData.edges = updates.edges;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.inputSchema !== undefined)
      updateData.inputSchema = updates.inputSchema;
    if (updates.outputSchema !== undefined)
      updateData.outputSchema = updates.outputSchema;

    // Increment version if nodes or edges changed
    if (updates.nodes !== undefined || updates.edges !== undefined) {
      updateData.version = workflow.version + 1;
    }

    await ctx.db.patch(id, updateData);

    return await ctx.db.get(id);
  },
});

/**
 * Delete a workflow
 *
 * Also deletes all associated executions and logs
 *
 * @param id - Workflow ID to delete
 */
export const deleteWorkflow = mutation({
  args: {
    id: v.id("workflows"),
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.id);
    if (!workflow) {
      throw new Error(`Workflow ${args.id} not found`);
    }

    // Delete associated executions
    const executions = await ctx.db
      .query("workflowExecutions")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.id))
      .collect();

    for (const execution of executions) {
      // Delete logs for this execution
      const logs = await ctx.db
        .query("executionLogs")
        .withIndex("by_execution", (q) => q.eq("executionId", execution._id))
        .collect();

      for (const log of logs) {
        await ctx.db.delete(log._id);
      }

      await ctx.db.delete(execution._id);
    }

    // Delete the workflow
    await ctx.db.delete(args.id);
  },
});

/**
 * List all workflows with optional filtering
 *
 * @param status - Optional status filter
 * @param limit - Number of workflows to return (default 50)
 * @returns Array of workflows
 */
export const listWorkflows = query({
  args: {
    status: v.optional(
      v.union(v.literal("draft"), v.literal("published"), v.literal("archived"))
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    let workflowsQuery;

    if (args.status) {
      workflowsQuery = ctx.db
        .query("workflows")
        .withIndex("by_status", (q) => q.eq("status", args.status!));
    } else {
      workflowsQuery = ctx.db.query("workflows").order("desc");
    }

    const workflows = await workflowsQuery.take(limit);

    // Get execution counts for each workflow
    const workflowsWithStats = await Promise.all(
      workflows.map(async (workflow) => {
        const executions = await ctx.db
          .query("workflowExecutions")
          .withIndex("by_workflow", (q) => q.eq("workflowId", workflow._id))
          .collect();

        const runningCount = executions.filter(
          (e) => e.status === "running"
        ).length;
        const totalCount = executions.length;

        return {
          ...workflow,
          executionStats: {
            total: totalCount,
            running: runningCount,
          },
        };
      })
    );

    return workflowsWithStats;
  },
});

/**
 * Get a single workflow by ID
 *
 * @param id - Workflow ID
 * @returns Workflow with full details
 */
export const getWorkflow = query({
  args: {
    id: v.id("workflows"),
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.id);
    if (!workflow) {
      return null;
    }

    // Get recent executions
    const recentExecutions = await ctx.db
      .query("workflowExecutions")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.id))
      .order("desc")
      .take(10);

    return {
      ...workflow,
      recentExecutions,
    };
  },
});

/**
 * Duplicate a workflow
 *
 * Creates a copy of an existing workflow with a new name
 *
 * @param id - Source workflow ID
 * @param name - Name for the new workflow
 * @returns ID of the new workflow
 */
export const duplicateWorkflow = mutation({
  args: {
    id: v.id("workflows"),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.id);
    if (!source) {
      throw new Error(`Workflow ${args.id} not found`);
    }

    const now = Date.now();
    const newName = args.name ?? `${source.name} (Copy)`;

    const newWorkflowId = await ctx.db.insert("workflows", {
      name: newName,
      description: source.description,
      nodes: source.nodes,
      edges: source.edges,
      status: "draft",
      inputSchema: source.inputSchema,
      outputSchema: source.outputSchema,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });

    return newWorkflowId;
  },
});

/**
 * Publish a workflow
 *
 * Changes status from draft to published
 *
 * @param id - Workflow ID
 */
export const publishWorkflow = mutation({
  args: {
    id: v.id("workflows"),
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.id);
    if (!workflow) {
      throw new Error(`Workflow ${args.id} not found`);
    }

    // Validate workflow has required structure
    const hasStart = workflow.nodes.some((n) => n.type === "start");
    const hasEnd = workflow.nodes.some((n) => n.type === "end");

    if (!hasStart || !hasEnd) {
      throw new Error("Workflow must have both Start and End nodes");
    }

    await ctx.db.patch(args.id, {
      status: "published",
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

/**
 * Archive a workflow
 *
 * Soft delete by changing status to archived
 *
 * @param id - Workflow ID
 */
export const archiveWorkflow = mutation({
  args: {
    id: v.id("workflows"),
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.id);
    if (!workflow) {
      throw new Error(`Workflow ${args.id} not found`);
    }

    await ctx.db.patch(args.id, {
      status: "archived",
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});
