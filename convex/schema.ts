import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Workflow definitions
  workflows: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
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
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived")
    ),
    variables: v.optional(
      v.record(
        v.string(),
        v.object({
          name: v.string(),
          type: v.union(
            v.literal("string"),
            v.literal("number"),
            v.literal("boolean"),
            v.literal("object"),
            v.literal("array")
          ),
          defaultValue: v.optional(v.any()),
          required: v.optional(v.boolean()),
          description: v.optional(v.string()),
        })
      )
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_updated", ["updatedAt"]),

  // Workflow executions
  executions: defineTable({
    workflowId: v.id("workflows"),
    convexWorkflowId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    input: v.any(),
    output: v.optional(v.any()),
    error: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    currentStep: v.optional(v.string()),
    stepResults: v.array(
      v.object({
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
      })
    ),
  })
    .index("by_workflow", ["workflowId"])
    .index("by_status", ["status"])
    .index("by_started", ["startedAt"]),

  // Execution logs
  executionLogs: defineTable({
    executionId: v.id("executions"),
    timestamp: v.number(),
    level: v.union(
      v.literal("debug"),
      v.literal("info"),
      v.literal("warn"),
      v.literal("error")
    ),
    message: v.string(),
    nodeId: v.optional(v.string()),
    data: v.optional(v.any()),
  })
    .index("by_execution", ["executionId"])
    .index("by_execution_timestamp", ["executionId", "timestamp"]),

  // Step templates for the palette
  stepTemplates: defineTable({
    name: v.string(),
    description: v.string(),
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
    icon: v.string(),
    category: v.union(
      v.literal("core"),
      v.literal("data"),
      v.literal("logic"),
      v.literal("integration"),
      v.literal("ai")
    ),
    configSchema: v.any(),
    defaultConfig: v.any(),
    color: v.optional(v.string()),
  })
    .index("by_category", ["category"])
    .index("by_type", ["type"]),
});
