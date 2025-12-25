/**
 * Convex Database Schema
 *
 * Defines all tables for the workflow builder:
 * - workflows: Workflow definitions with nodes and edges
 * - workflowExecutions: Execution instances with real-time status
 * - stepTemplates: Reusable step templates for the node palette
 * - executionLogs: Detailed execution logs for debugging
 */
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Node type validator - all supported node types
const nodeTypeValidator = v.union(
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
);

// Node definition validator
const nodeValidator = v.object({
  id: v.string(),
  type: nodeTypeValidator,
  position: v.object({ x: v.number(), y: v.number() }),
  data: v.object({
    label: v.string(),
    config: v.any(), // Configuration specific to node type
  }),
});

// Edge definition validator
const edgeValidator = v.object({
  id: v.string(),
  source: v.string(),
  target: v.string(),
  sourceHandle: v.optional(v.string()),
  targetHandle: v.optional(v.string()),
  label: v.optional(v.string()), // For condition edges (true/false labels)
});

// Workflow status validator
const workflowStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived")
);

// Execution status validator
const executionStatusValidator = v.union(
  v.literal("pending"),
  v.literal("running"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("cancelled")
);

// Step result validator for tracking individual step execution
const stepResultValidator = v.object({
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
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
});

// Step template category validator
const categoryValidator = v.union(
  v.literal("core"),
  v.literal("data"),
  v.literal("logic"),
  v.literal("integration"),
  v.literal("ai")
);

// Log level validator
const logLevelValidator = v.union(
  v.literal("debug"),
  v.literal("info"),
  v.literal("warn"),
  v.literal("error")
);

export default defineSchema({
  /**
   * Workflows table - stores workflow definitions
   * Each workflow contains nodes (steps) and edges (connections)
   */
  workflows: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    nodes: v.array(nodeValidator),
    edges: v.array(edgeValidator),
    status: workflowStatusValidator,
    // Input schema for the workflow (JSON Schema format)
    inputSchema: v.optional(v.any()),
    // Output schema for the workflow (JSON Schema format)
    outputSchema: v.optional(v.any()),
    // Version tracking
    version: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_name", ["name"])
    .index("by_updated", ["updatedAt"]),

  /**
   * Workflow Executions table - tracks execution instances
   * Provides real-time status updates via Convex subscriptions
   */
  workflowExecutions: defineTable({
    workflowId: v.id("workflows"),
    // The workflow ID from @convex-dev/workflow
    convexWorkflowId: v.optional(v.string()),
    status: executionStatusValidator,
    // Input data provided when execution started
    input: v.any(),
    // Final output after completion
    output: v.optional(v.any()),
    // Error message if failed
    error: v.optional(v.string()),
    // Timestamps
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    // Current step being executed
    currentStep: v.optional(v.string()),
    // Results for each step
    stepResults: v.array(stepResultValidator),
    // Retry count
    retryCount: v.number(),
  })
    .index("by_workflow", ["workflowId"])
    .index("by_status", ["status"])
    .index("by_workflow_and_status", ["workflowId", "status"])
    .index("by_started", ["startedAt"]),

  /**
   * Step Templates table - reusable step definitions
   * Used to populate the node palette in the UI
   */
  stepTemplates: defineTable({
    name: v.string(),
    description: v.string(),
    type: nodeTypeValidator,
    icon: v.string(), // Lucide icon name
    category: categoryValidator,
    // JSON Schema for configuration options
    configSchema: v.any(),
    // Default configuration values
    defaultConfig: v.any(),
    // Whether this template is built-in or custom
    isBuiltIn: v.boolean(),
  })
    .index("by_category", ["category"])
    .index("by_type", ["type"])
    .index("by_name", ["name"]),

  /**
   * Execution Logs table - detailed logging for debugging
   * Supports real-time log streaming
   */
  executionLogs: defineTable({
    executionId: v.id("workflowExecutions"),
    nodeId: v.optional(v.string()),
    level: logLevelValidator,
    message: v.string(),
    data: v.optional(v.any()), // Additional context data
    timestamp: v.number(),
  })
    .index("by_execution", ["executionId"])
    .index("by_execution_and_node", ["executionId", "nodeId"])
    .index("by_timestamp", ["timestamp"]),
});
