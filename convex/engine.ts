/**
 * Workflow Execution Engine
 *
 * The core engine that dynamically executes workflow definitions.
 * - Parses workflow graph (nodes and edges)
 * - Executes nodes in topological order
 * - Handles conditions and branching
 * - Supports parallel execution
 * - Records step results in real-time
 */
import { internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { Id, Doc } from "./_generated/dataModel";
import { workflowManager } from "./index";

// Type definitions
type NodeType =
  | "start"
  | "end"
  | "action"
  | "mutation"
  | "query"
  | "condition"
  | "delay"
  | "parallel"
  | "loop"
  | "ai"
  | "http"
  | "transform";

interface WorkflowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: {
    label: string;
    config: Record<string, unknown>;
  };
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

interface ExecutionContext {
  executionId: Id<"workflowExecutions">;
  workflowId: Id<"workflows">;
  input: Record<string, unknown>;
  stepOutputs: Record<string, unknown>;
}

/**
 * Build adjacency list from edges for graph traversal
 */
function buildAdjacencyList(
  edges: WorkflowEdge[]
): Map<string, { target: string; label?: string }[]> {
  const adjacency = new Map<string, { target: string; label?: string }[]>();

  for (const edge of edges) {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, []);
    }
    adjacency.get(edge.source)!.push({
      target: edge.target,
      label: edge.label,
    });
  }

  return adjacency;
}

/**
 * Find the start node in a workflow
 */
function findStartNode(nodes: WorkflowNode[]): WorkflowNode | undefined {
  return nodes.find((n) => n.type === "start");
}

/**
 * Get incoming edges for a node
 */
function getIncomingEdges(
  nodeId: string,
  edges: WorkflowEdge[]
): WorkflowEdge[] {
  return edges.filter((e) => e.target === nodeId);
}

/**
 * Topological sort with support for conditional branching
 */
function getExecutionOrder(
  startNodeId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): string[] {
  const adjacency = buildAdjacencyList(edges);
  const visited = new Set<string>();
  const order: string[] = [];

  function dfs(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    order.push(nodeId);

    const neighbors = adjacency.get(nodeId) || [];
    for (const { target } of neighbors) {
      dfs(target);
    }
  }

  dfs(startNodeId);
  return order;
}

/**
 * Main workflow execution function
 *
 * This is scheduled to run when a workflow execution is started.
 * It uses the @convex-dev/workflow library for durable execution.
 */
export const runWorkflow = internalAction({
  args: {
    executionId: v.id("workflowExecutions"),
    workflowId: v.id("workflows"),
  },
  handler: async (ctx, args) => {
    // Get workflow and execution data
    const workflow = await ctx.runQuery(api.workflows.getWorkflow, {
      id: args.workflowId,
    });

    if (!workflow) {
      await ctx.runMutation(internal.executions.updateExecutionStatus, {
        executionId: args.executionId,
        status: "failed",
        error: "Workflow not found",
      });
      return;
    }

    // Update status to running
    await ctx.runMutation(internal.executions.updateExecutionStatus, {
      executionId: args.executionId,
      status: "running",
    });

    // Get input from execution record
    const execution = await ctx.runQuery(api.executions.getExecution, {
      id: args.executionId,
    });

    if (!execution) {
      return;
    }

    // Start the durable workflow
    const workflowHandle = await workflowManager.start(
      ctx,
      internal.engine.executeWorkflowSteps,
      {
        executionId: args.executionId,
        workflowId: args.workflowId,
        nodes: workflow.nodes,
        edges: workflow.edges,
        input: execution.input,
      }
    );

    // Store the workflow handle ID
    await ctx.runMutation(internal.engine.setConvexWorkflowId, {
      executionId: args.executionId,
      convexWorkflowId: workflowHandle.workflowId,
    });
  },
});

/**
 * Set the Convex workflow ID on an execution
 */
export const setConvexWorkflowId = internalMutation({
  args: {
    executionId: v.id("workflowExecutions"),
    convexWorkflowId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.executionId, {
      convexWorkflowId: args.convexWorkflowId,
    });
  },
});

/**
 * The durable workflow function that executes all steps
 *
 * This is the actual workflow that gets registered with the workflow manager.
 * It handles step-by-step execution with durability guarantees.
 */
export const executeWorkflowSteps = workflowManager.define({
  args: {
    executionId: v.id("workflowExecutions"),
    workflowId: v.id("workflows"),
    nodes: v.array(v.any()),
    edges: v.array(v.any()),
    input: v.any(),
  },
  handler: async (step, args): Promise<{ success: boolean; output?: unknown; error?: string }> => {
    const nodes = args.nodes as WorkflowNode[];
    const edges = args.edges as WorkflowEdge[];
    const adjacency = buildAdjacencyList(edges);

    // Find start node
    const startNode = findStartNode(nodes);
    if (!startNode) {
      await step.runMutation(internal.executions.updateExecutionStatus, {
        executionId: args.executionId,
        status: "failed",
        error: "No start node found",
      });
      return { success: false, error: "No start node found" };
    }

    // Track outputs from each step
    const stepOutputs: Record<string, unknown> = {
      input: args.input,
    };

    // Execute nodes starting from start node
    const visited = new Set<string>();
    const queue: string[] = [startNode.id];

    try {
      while (queue.length > 0) {
        const currentNodeId = queue.shift()!;

        if (visited.has(currentNodeId)) continue;
        visited.add(currentNodeId);

        const currentNode = nodes.find((n) => n.id === currentNodeId);
        if (!currentNode) continue;

        // Update current step
        await step.runMutation(internal.executions.updateStepResult, {
          executionId: args.executionId,
          nodeId: currentNodeId,
          status: "running",
        });

        // Execute the node based on its type
        let output: unknown;
        let nextNodes: string[] = [];

        try {
          const result = await executeNode(
            step,
            currentNode,
            stepOutputs,
            args.executionId,
            adjacency
          );

          output = result.output;
          nextNodes = result.nextNodes;
          stepOutputs[currentNodeId] = output;

          // Mark step as completed
          await step.runMutation(internal.executions.updateStepResult, {
            executionId: args.executionId,
            nodeId: currentNodeId,
            status: "completed",
            output,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          await step.runMutation(internal.executions.updateStepResult, {
            executionId: args.executionId,
            nodeId: currentNodeId,
            status: "failed",
            error: errorMessage,
          });

          throw error;
        }

        // Add next nodes to queue (unless it's an end node)
        if (currentNode.type !== "end") {
          for (const nextNodeId of nextNodes) {
            if (!visited.has(nextNodeId)) {
              queue.push(nextNodeId);
            }
          }
        }
      }

      // Find the end node output
      const endNode = nodes.find((n) => n.type === "end");
      const finalOutput = endNode ? stepOutputs[endNode.id] : stepOutputs;

      // Mark execution as completed
      await step.runMutation(internal.executions.updateExecutionStatus, {
        executionId: args.executionId,
        status: "completed",
        output: finalOutput,
      });

      return { success: true, output: finalOutput };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await step.runMutation(internal.executions.updateExecutionStatus, {
        executionId: args.executionId,
        status: "failed",
        error: errorMessage,
      });

      return { success: false, error: errorMessage };
    }
  },
});

/**
 * Execute a single node and return its output and next nodes
 */
async function executeNode(
  step: Parameters<Parameters<typeof workflowManager.define>[0]["handler"]>[0],
  node: WorkflowNode,
  stepOutputs: Record<string, unknown>,
  executionId: Id<"workflowExecutions">,
  adjacency: Map<string, { target: string; label?: string }[]>
): Promise<{ output: unknown; nextNodes: string[] }> {
  const config = node.data.config;
  const neighbors = adjacency.get(node.id) || [];

  switch (node.type) {
    case "start": {
      // Start node just passes through the input
      return {
        output: stepOutputs.input,
        nextNodes: neighbors.map((n) => n.target),
      };
    }

    case "end": {
      // End node collects final output
      const outputMapping = (config.outputMapping as Record<string, string>) || {};
      const output: Record<string, unknown> = {};

      // If no mapping, pass through the last step's output
      if (Object.keys(outputMapping).length === 0) {
        return { output: stepOutputs, nextNodes: [] };
      }

      // Map outputs based on configuration
      for (const [key, sourceRef] of Object.entries(outputMapping)) {
        output[key] = resolveReference(sourceRef, stepOutputs);
      }

      return { output, nextNodes: [] };
    }

    case "http": {
      // Execute HTTP request
      const result = await step.runAction(internal.steps.http.executeHttpRequest, {
        executionId,
        nodeId: node.id,
        config: {
          url: resolveTemplate(config.url as string, stepOutputs),
          method: config.method as string,
          headers: resolveTemplateObject(
            config.headers as Record<string, string> | undefined,
            stepOutputs
          ),
          body: config.body
            ? resolveTemplate(JSON.stringify(config.body), stepOutputs)
            : undefined,
        },
      });

      return {
        output: result,
        nextNodes: neighbors.map((n) => n.target),
      };
    }

    case "transform": {
      // Execute data transformation
      const result = await step.runAction(internal.steps.transform.executeTransform, {
        executionId,
        nodeId: node.id,
        config: {
          expression: config.expression as string,
          inputData: stepOutputs,
        },
      });

      return {
        output: result,
        nextNodes: neighbors.map((n) => n.target),
      };
    }

    case "condition": {
      // Evaluate condition and determine branch
      const result = await step.runAction(internal.steps.condition.evaluateCondition, {
        executionId,
        nodeId: node.id,
        config: {
          expression: config.expression as string,
          inputData: stepOutputs,
        },
      });

      // Find the correct branch based on result
      const trueBranch = neighbors.find((n) => n.label === "true");
      const falseBranch = neighbors.find((n) => n.label === "false");

      const nextNode = result ? trueBranch?.target : falseBranch?.target;

      return {
        output: result,
        nextNodes: nextNode ? [nextNode] : [],
      };
    }

    case "delay": {
      // Execute delay
      await step.runAction(internal.steps.delay.executeDelay, {
        executionId,
        nodeId: node.id,
        config: {
          durationMs: config.durationMs as number,
        },
      });

      return {
        output: { delayed: true, duration: config.durationMs },
        nextNodes: neighbors.map((n) => n.target),
      };
    }

    case "ai": {
      // Execute AI/LLM call
      const result = await step.runAction(internal.steps.ai.executeAICall, {
        executionId,
        nodeId: node.id,
        config: {
          prompt: resolveTemplate(config.prompt as string, stepOutputs),
          model: config.model as string,
          temperature: config.temperature as number | undefined,
        },
      });

      return {
        output: result,
        nextNodes: neighbors.map((n) => n.target),
      };
    }

    case "parallel": {
      // For parallel nodes, we need to execute all branches and wait for them
      // This is a simplified implementation - real parallel execution would be more complex
      const results: Record<string, unknown> = {};

      for (const neighbor of neighbors) {
        results[neighbor.target] = null; // Placeholder - branches would execute in parallel
      }

      return {
        output: results,
        nextNodes: neighbors.map((n) => n.target),
      };
    }

    case "loop": {
      // Loop over an array
      const items = resolveReference(config.itemsRef as string, stepOutputs) as unknown[];
      const results: unknown[] = [];

      if (Array.isArray(items)) {
        for (let i = 0; i < items.length; i++) {
          results.push({
            index: i,
            item: items[i],
          });
        }
      }

      return {
        output: results,
        nextNodes: neighbors.map((n) => n.target),
      };
    }

    case "action":
    case "mutation":
    case "query": {
      // These would execute custom Convex functions
      // For now, return a placeholder
      await step.runMutation(internal.executions.addExecutionLog, {
        executionId,
        nodeId: node.id,
        level: "info",
        message: `Executing ${node.type}: ${config.functionName || "unknown"}`,
      });

      return {
        output: { type: node.type, config },
        nextNodes: neighbors.map((n) => n.target),
      };
    }

    default:
      return {
        output: null,
        nextNodes: neighbors.map((n) => n.target),
      };
  }
}

/**
 * Resolve a template string with variable substitutions
 * e.g., "Hello {{input.name}}" becomes "Hello John"
 */
function resolveTemplate(
  template: string,
  context: Record<string, unknown>
): string {
  if (!template) return template;

  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = resolveReference(path.trim(), context);
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Resolve a reference path like "input.user.name" to its value
 */
function resolveReference(
  path: string,
  context: Record<string, unknown>
): unknown {
  const parts = path.split(".");
  let current: unknown = context;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current === "object") {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Resolve templates in an object's values
 */
function resolveTemplateObject(
  obj: Record<string, string> | undefined,
  context: Record<string, unknown>
): Record<string, string> | undefined {
  if (!obj) return undefined;

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = resolveTemplate(value, context);
  }
  return result;
}
