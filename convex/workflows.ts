import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Query to get all workflows
export const list = query({
  args: {
    status: v.optional(
      v.union(v.literal("draft"), v.literal("published"), v.literal("archived"))
    ),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("workflows")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    }
    return await ctx.db
      .query("workflows")
      .withIndex("by_updated")
      .order("desc")
      .collect();
  },
});

// Query to get a single workflow by ID
export const get = query({
  args: { id: v.id("workflows") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new workflow
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const workflowId = await ctx.db.insert("workflows", {
      name: args.name,
      description: args.description,
      nodes: [
        {
          id: "start-1",
          type: "start",
          position: { x: 250, y: 50 },
          data: { label: "Start", config: {} },
        },
        {
          id: "end-1",
          type: "end",
          position: { x: 250, y: 400 },
          data: { label: "End", config: {} },
        },
      ],
      edges: [],
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
    return workflowId;
  },
});

// Update workflow name/description
export const update = mutation({
  args: {
    id: v.id("workflows"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const workflow = await ctx.db.get(id);
    if (!workflow) throw new Error("Workflow not found");

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Update workflow nodes and edges
export const updateCanvas = mutation({
  args: {
    id: v.id("workflows"),
    nodes: v.array(
      v.object({
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
          v.literal("ai")
        ),
        position: v.object({
          x: v.number(),
          y: v.number(),
        }),
        data: v.object({
          label: v.string(),
          description: v.optional(v.string()),
          icon: v.optional(v.string()),
          config: v.any(),
        }),
      })
    ),
    edges: v.array(
      v.object({
        id: v.string(),
        source: v.string(),
        target: v.string(),
        sourceHandle: v.optional(v.string()),
        targetHandle: v.optional(v.string()),
        label: v.optional(v.string()),
        animated: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.id);
    if (!workflow) throw new Error("Workflow not found");

    await ctx.db.patch(args.id, {
      nodes: args.nodes,
      edges: args.edges,
      updatedAt: Date.now(),
    });
  },
});

// Update a single node's configuration
export const updateNodeConfig = mutation({
  args: {
    workflowId: v.id("workflows"),
    nodeId: v.string(),
    data: v.object({
      label: v.string(),
      description: v.optional(v.string()),
      icon: v.optional(v.string()),
      config: v.any(),
    }),
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow) throw new Error("Workflow not found");

    const updatedNodes = workflow.nodes.map((node) =>
      node.id === args.nodeId ? { ...node, data: args.data } : node
    );

    await ctx.db.patch(args.workflowId, {
      nodes: updatedNodes,
      updatedAt: Date.now(),
    });
  },
});

// Publish a workflow
export const publish = mutation({
  args: { id: v.id("workflows") },
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.id);
    if (!workflow) throw new Error("Workflow not found");

    // Validate workflow has at least start and end nodes
    const hasStart = workflow.nodes.some((n) => n.type === "start");
    const hasEnd = workflow.nodes.some((n) => n.type === "end");

    if (!hasStart || !hasEnd) {
      throw new Error("Workflow must have both start and end nodes");
    }

    await ctx.db.patch(args.id, {
      status: "published",
      updatedAt: Date.now(),
    });
  },
});

// Archive a workflow
export const archive = mutation({
  args: { id: v.id("workflows") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "archived",
      updatedAt: Date.now(),
    });
  },
});

// Delete a workflow
export const remove = mutation({
  args: { id: v.id("workflows") },
  handler: async (ctx, args) => {
    // Delete associated executions and logs
    const executions = await ctx.db
      .query("executions")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.id))
      .collect();

    for (const execution of executions) {
      const logs = await ctx.db
        .query("executionLogs")
        .withIndex("by_execution", (q) => q.eq("executionId", execution._id))
        .collect();

      for (const log of logs) {
        await ctx.db.delete(log._id);
      }
      await ctx.db.delete(execution._id);
    }

    await ctx.db.delete(args.id);
  },
});

// Duplicate a workflow
export const duplicate = mutation({
  args: { id: v.id("workflows") },
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.id);
    if (!workflow) throw new Error("Workflow not found");

    const now = Date.now();
    const newId = await ctx.db.insert("workflows", {
      name: `${workflow.name} (Copy)`,
      description: workflow.description,
      nodes: workflow.nodes,
      edges: workflow.edges,
      status: "draft",
      variables: workflow.variables,
      createdAt: now,
      updatedAt: now,
    });

    return newId;
  },
});
