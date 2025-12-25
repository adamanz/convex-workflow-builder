import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Query to get all step templates
export const list = query({
  args: {
    category: v.optional(
      v.union(
        v.literal("core"),
        v.literal("data"),
        v.literal("logic"),
        v.literal("integration"),
        v.literal("ai")
      )
    ),
  },
  handler: async (ctx, args) => {
    if (args.category) {
      return await ctx.db
        .query("stepTemplates")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .collect();
    }
    return await ctx.db.query("stepTemplates").collect();
  },
});

// Seed default templates
export const seedDefaults = mutation({
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("stepTemplates").first();
    if (existing) return;

    const templates = [
      // Core nodes
      {
        name: "Start",
        description: "Entry point of the workflow",
        type: "start" as const,
        icon: "play",
        category: "core" as const,
        configSchema: {},
        defaultConfig: {},
        color: "#22C55E",
      },
      {
        name: "End",
        description: "Exit point of the workflow",
        type: "end" as const,
        icon: "square",
        category: "core" as const,
        configSchema: {},
        defaultConfig: {},
        color: "#EF4444",
      },
      // Data nodes
      {
        name: "Query",
        description: "Query data from Convex database",
        type: "query" as const,
        icon: "database",
        category: "data" as const,
        configSchema: {
          functionPath: { type: "string", required: true },
          args: { type: "object" },
        },
        defaultConfig: { functionPath: "", args: {} },
        color: "#3B82F6",
      },
      {
        name: "Mutation",
        description: "Mutate data in Convex database",
        type: "mutation" as const,
        icon: "edit",
        category: "data" as const,
        configSchema: {
          functionPath: { type: "string", required: true },
          args: { type: "object" },
        },
        defaultConfig: { functionPath: "", args: {} },
        color: "#8B5CF6",
      },
      // Logic nodes
      {
        name: "Condition",
        description: "Branch based on a condition",
        type: "condition" as const,
        icon: "git-branch",
        category: "logic" as const,
        configSchema: {
          conditionType: { type: "string", enum: ["expression", "compare"] },
          expression: { type: "string" },
          left: { type: "string" },
          operator: { type: "string" },
          right: { type: "string" },
        },
        defaultConfig: { conditionType: "compare", operator: "==" },
        color: "#F59E0B",
      },
      {
        name: "Delay",
        description: "Wait for a specified duration",
        type: "delay" as const,
        icon: "clock",
        category: "logic" as const,
        configSchema: {
          delayType: { type: "string", enum: ["duration", "until"] },
          durationMs: { type: "number" },
          untilTimestamp: { type: "number" },
        },
        defaultConfig: { delayType: "duration", durationMs: 5000 },
        color: "#6366F1",
      },
      {
        name: "Parallel",
        description: "Execute multiple branches in parallel",
        type: "parallel" as const,
        icon: "git-merge",
        category: "logic" as const,
        configSchema: {
          branches: { type: "array" },
          waitForAll: { type: "boolean" },
        },
        defaultConfig: { branches: [], waitForAll: true },
        color: "#EC4899",
      },
      {
        name: "Loop",
        description: "Iterate over a collection",
        type: "loop" as const,
        icon: "repeat",
        category: "logic" as const,
        configSchema: {
          iterateOver: { type: "string", required: true },
          itemVariable: { type: "string", required: true },
          indexVariable: { type: "string" },
        },
        defaultConfig: { iterateOver: "", itemVariable: "item" },
        color: "#14B8A6",
      },
      // Integration nodes
      {
        name: "HTTP Request",
        description: "Make an HTTP request to an external API",
        type: "action" as const,
        icon: "globe",
        category: "integration" as const,
        configSchema: {
          actionType: { type: "string" },
          url: { type: "string", required: true },
          method: { type: "string", enum: ["GET", "POST", "PUT", "DELETE", "PATCH"] },
          headers: { type: "object" },
          body: { type: "string" },
        },
        defaultConfig: { actionType: "http", method: "GET" },
        color: "#0EA5E9",
      },
      // AI nodes
      {
        name: "AI Prompt",
        description: "Process text with an AI model",
        type: "ai" as const,
        icon: "sparkles",
        category: "ai" as const,
        configSchema: {
          model: { type: "string", enum: ["gpt-4", "gpt-3.5-turbo", "claude-3", "claude-2"] },
          prompt: { type: "string", required: true },
          systemPrompt: { type: "string" },
          temperature: { type: "number" },
          maxTokens: { type: "number" },
          outputVariable: { type: "string" },
        },
        defaultConfig: { model: "gpt-4", temperature: 0.7, maxTokens: 500 },
        color: "#A855F7",
      },
    ];

    for (const template of templates) {
      await ctx.db.insert("stepTemplates", template);
    }
  },
});
