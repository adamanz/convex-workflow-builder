/**
 * Test Utilities and Seed Data for Workflow Builder
 *
 * Provides:
 * - Sample node configurations for all node types
 * - Seed data factories for workflows, executions, and templates
 * - Test helpers for common operations
 */

import { Id } from "../_generated/dataModel";

// ============================================================================
// Node Types and Configurations
// ============================================================================

export type NodeType =
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

export interface Position {
  x: number;
  y: number;
}

export interface NodeData {
  label: string;
  config: Record<string, unknown>;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: Position;
  data: NodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

// ============================================================================
// Node Factory Functions
// ============================================================================

let nodeIdCounter = 1;

/**
 * Generate a unique node ID
 */
export function generateNodeId(type: NodeType): string {
  return `${type}-${nodeIdCounter++}`;
}

/**
 * Reset node ID counter (for test isolation)
 */
export function resetNodeIdCounter(): void {
  nodeIdCounter = 1;
}

/**
 * Create a Start node
 */
export function createStartNode(
  position: Position = { x: 250, y: 50 },
  label = "Start"
): WorkflowNode {
  return {
    id: generateNodeId("start"),
    type: "start",
    position,
    data: {
      label,
      config: {},
    },
  };
}

/**
 * Create an End node
 */
export function createEndNode(
  position: Position = { x: 250, y: 450 },
  label = "End"
): WorkflowNode {
  return {
    id: generateNodeId("end"),
    type: "end",
    position,
    data: {
      label,
      config: {},
    },
  };
}

/**
 * Create an Action node
 */
export function createActionNode(
  label: string,
  position: Position = { x: 250, y: 150 },
  config: Record<string, unknown> = {}
): WorkflowNode {
  return {
    id: generateNodeId("action"),
    type: "action",
    position,
    data: {
      label,
      config: {
        actionType: "custom",
        functionName: "myAction",
        ...config,
      },
    },
  };
}

/**
 * Create an HTTP node
 */
export function createHttpNode(
  label: string,
  url: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  position: Position = { x: 250, y: 200 }
): WorkflowNode {
  return {
    id: generateNodeId("http"),
    type: "http",
    position,
    data: {
      label,
      config: {
        url,
        method,
        headers: {},
        body: null,
        timeout: 30000,
      },
    },
  };
}

/**
 * Create a Condition node
 */
export function createConditionNode(
  label: string,
  expression: string,
  position: Position = { x: 250, y: 200 }
): WorkflowNode {
  return {
    id: generateNodeId("condition"),
    type: "condition",
    position,
    data: {
      label,
      config: {
        conditionType: "expression",
        expression,
        leftOperand: null,
        operator: null,
        rightOperand: null,
      },
    },
  };
}

/**
 * Create a Delay node
 */
export function createDelayNode(
  label: string,
  durationMs: number,
  position: Position = { x: 250, y: 200 }
): WorkflowNode {
  return {
    id: generateNodeId("delay"),
    type: "delay",
    position,
    data: {
      label,
      config: {
        delayType: "duration",
        durationMs,
        until: null,
      },
    },
  };
}

/**
 * Create a Parallel node
 */
export function createParallelNode(
  label: string,
  branchNodeIds: string[],
  position: Position = { x: 250, y: 200 }
): WorkflowNode {
  return {
    id: generateNodeId("parallel"),
    type: "parallel",
    position,
    data: {
      label,
      config: {
        branches: branchNodeIds,
        waitForAll: true,
      },
    },
  };
}

/**
 * Create a Loop node
 */
export function createLoopNode(
  label: string,
  arrayExpression: string,
  position: Position = { x: 250, y: 200 }
): WorkflowNode {
  return {
    id: generateNodeId("loop"),
    type: "loop",
    position,
    data: {
      label,
      config: {
        iterateOver: arrayExpression,
        itemVariable: "item",
        indexVariable: "index",
        maxIterations: 100,
      },
    },
  };
}

/**
 * Create an AI node
 */
export function createAINode(
  label: string,
  model: string = "gpt-4",
  prompt: string,
  position: Position = { x: 250, y: 200 }
): WorkflowNode {
  return {
    id: generateNodeId("ai"),
    type: "ai",
    position,
    data: {
      label,
      config: {
        model,
        prompt,
        temperature: 0.7,
        maxTokens: 1000,
        systemPrompt: null,
      },
    },
  };
}

/**
 * Create a Transform node
 */
export function createTransformNode(
  label: string,
  expression: string,
  position: Position = { x: 250, y: 200 }
): WorkflowNode {
  return {
    id: generateNodeId("transform"),
    type: "transform",
    position,
    data: {
      label,
      config: {
        transformType: "jmespath",
        expression,
        schema: null,
      },
    },
  };
}

/**
 * Create a Mutation node
 */
export function createMutationNode(
  label: string,
  mutationName: string,
  args: Record<string, unknown> = {},
  position: Position = { x: 250, y: 200 }
): WorkflowNode {
  return {
    id: generateNodeId("mutation"),
    type: "mutation",
    position,
    data: {
      label,
      config: {
        mutationName,
        args,
      },
    },
  };
}

/**
 * Create a Query node
 */
export function createQueryNode(
  label: string,
  queryName: string,
  args: Record<string, unknown> = {},
  position: Position = { x: 250, y: 200 }
): WorkflowNode {
  return {
    id: generateNodeId("query"),
    type: "query",
    position,
    data: {
      label,
      config: {
        queryName,
        args,
        outputVariable: "queryResult",
      },
    },
  };
}

// ============================================================================
// Edge Factory Functions
// ============================================================================

let edgeIdCounter = 1;

/**
 * Reset edge ID counter (for test isolation)
 */
export function resetEdgeIdCounter(): void {
  edgeIdCounter = 1;
}

/**
 * Create an edge between two nodes
 */
export function createEdge(
  source: string,
  target: string,
  label?: string
): WorkflowEdge {
  return {
    id: `edge-${edgeIdCounter++}`,
    source,
    target,
    label,
  };
}

/**
 * Create a conditional edge (for condition nodes)
 */
export function createConditionalEdge(
  source: string,
  target: string,
  condition: "true" | "false",
  sourceHandle?: string
): WorkflowEdge {
  return {
    id: `edge-${edgeIdCounter++}`,
    source,
    target,
    sourceHandle: sourceHandle ?? `${condition}-handle`,
    label: condition,
  };
}

// ============================================================================
// Workflow Factory Functions
// ============================================================================

export interface WorkflowSeedData {
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  status?: "draft" | "published" | "archived";
  inputSchema?: unknown;
  outputSchema?: unknown;
}

/**
 * Create a minimal workflow (start -> end)
 */
export function createMinimalWorkflow(
  name = "Minimal Workflow"
): WorkflowSeedData {
  resetNodeIdCounter();
  resetEdgeIdCounter();

  const startNode = createStartNode();
  const endNode = createEndNode();

  return {
    name,
    description: "A minimal workflow with just start and end nodes",
    nodes: [startNode, endNode],
    edges: [createEdge(startNode.id, endNode.id)],
    status: "draft",
  };
}

/**
 * Create a simple linear workflow
 */
export function createLinearWorkflow(
  name = "Linear Workflow",
  actionLabels: string[] = ["Process Data", "Transform", "Save"]
): WorkflowSeedData {
  resetNodeIdCounter();
  resetEdgeIdCounter();

  const startNode = createStartNode();
  const actionNodes = actionLabels.map((label, index) =>
    createActionNode(label, { x: 250, y: 100 + index * 100 })
  );
  const endNode = createEndNode({ x: 250, y: 100 + actionLabels.length * 100 });

  const allNodes = [startNode, ...actionNodes, endNode];

  // Create edges linking all nodes sequentially
  const edges: WorkflowEdge[] = [];
  for (let i = 0; i < allNodes.length - 1; i++) {
    edges.push(createEdge(allNodes[i].id, allNodes[i + 1].id));
  }

  return {
    name,
    description: `A linear workflow with ${actionLabels.length} action steps`,
    nodes: allNodes,
    edges,
    status: "draft",
  };
}

/**
 * Create a workflow with a conditional branch
 */
export function createConditionalWorkflow(
  name = "Conditional Workflow"
): WorkflowSeedData {
  resetNodeIdCounter();
  resetEdgeIdCounter();

  const startNode = createStartNode();
  const conditionNode = createConditionNode("Check Value", "input.value > 10", {
    x: 250,
    y: 150,
  });
  const trueAction = createActionNode("Handle Large Value", { x: 100, y: 250 });
  const falseAction = createActionNode("Handle Small Value", { x: 400, y: 250 });
  const mergeAction = createActionNode("Merge Results", { x: 250, y: 350 });
  const endNode = createEndNode({ x: 250, y: 450 });

  return {
    name,
    description: "A workflow with conditional branching",
    nodes: [startNode, conditionNode, trueAction, falseAction, mergeAction, endNode],
    edges: [
      createEdge(startNode.id, conditionNode.id),
      createConditionalEdge(conditionNode.id, trueAction.id, "true"),
      createConditionalEdge(conditionNode.id, falseAction.id, "false"),
      createEdge(trueAction.id, mergeAction.id),
      createEdge(falseAction.id, mergeAction.id),
      createEdge(mergeAction.id, endNode.id),
    ],
    status: "draft",
  };
}

/**
 * Create a workflow with parallel execution
 */
export function createParallelWorkflow(
  name = "Parallel Workflow"
): WorkflowSeedData {
  resetNodeIdCounter();
  resetEdgeIdCounter();

  const startNode = createStartNode();
  const parallel1 = createActionNode("Task A", { x: 100, y: 150 });
  const parallel2 = createActionNode("Task B", { x: 250, y: 150 });
  const parallel3 = createActionNode("Task C", { x: 400, y: 150 });
  const parallelNode = createParallelNode(
    "Run Parallel",
    [parallel1.id, parallel2.id, parallel3.id],
    { x: 250, y: 250 }
  );
  const endNode = createEndNode({ x: 250, y: 350 });

  return {
    name,
    description: "A workflow with parallel task execution",
    nodes: [startNode, parallel1, parallel2, parallel3, parallelNode, endNode],
    edges: [
      createEdge(startNode.id, parallel1.id),
      createEdge(startNode.id, parallel2.id),
      createEdge(startNode.id, parallel3.id),
      createEdge(parallel1.id, parallelNode.id),
      createEdge(parallel2.id, parallelNode.id),
      createEdge(parallel3.id, parallelNode.id),
      createEdge(parallelNode.id, endNode.id),
    ],
    status: "draft",
  };
}

/**
 * Create a workflow with a loop
 */
export function createLoopWorkflow(name = "Loop Workflow"): WorkflowSeedData {
  resetNodeIdCounter();
  resetEdgeIdCounter();

  const startNode = createStartNode();
  const loopNode = createLoopNode("Process Items", "input.items", {
    x: 250,
    y: 150,
  });
  const processAction = createActionNode("Process Item", { x: 250, y: 250 });
  const endNode = createEndNode({ x: 250, y: 350 });

  return {
    name,
    description: "A workflow with loop iteration",
    nodes: [startNode, loopNode, processAction, endNode],
    edges: [
      createEdge(startNode.id, loopNode.id),
      createEdge(loopNode.id, processAction.id),
      createEdge(processAction.id, loopNode.id), // Loop back
      createEdge(loopNode.id, endNode.id), // Loop exit
    ],
    status: "draft",
  };
}

/**
 * Create a workflow with HTTP and AI nodes
 */
export function createIntegrationWorkflow(
  name = "Integration Workflow"
): WorkflowSeedData {
  resetNodeIdCounter();
  resetEdgeIdCounter();

  const startNode = createStartNode();
  const httpNode = createHttpNode("Fetch Data", "https://api.example.com/data", "GET", {
    x: 250,
    y: 150,
  });
  const transformNode = createTransformNode("Extract Fields", "data.results[*].name", {
    x: 250,
    y: 250,
  });
  const aiNode = createAINode("Analyze", "gpt-4", "Analyze the following data: {{input}}", {
    x: 250,
    y: 350,
  });
  const endNode = createEndNode({ x: 250, y: 450 });

  return {
    name,
    description: "A workflow with HTTP requests and AI processing",
    nodes: [startNode, httpNode, transformNode, aiNode, endNode],
    edges: [
      createEdge(startNode.id, httpNode.id),
      createEdge(httpNode.id, transformNode.id),
      createEdge(transformNode.id, aiNode.id),
      createEdge(aiNode.id, endNode.id),
    ],
    status: "draft",
  };
}

/**
 * Create a complex workflow with multiple patterns
 */
export function createComplexWorkflow(
  name = "Complex Workflow"
): WorkflowSeedData {
  resetNodeIdCounter();
  resetEdgeIdCounter();

  const startNode = createStartNode();

  // Initial fetch
  const httpNode = createHttpNode("Fetch User Data", "https://api.example.com/users", "GET", {
    x: 250,
    y: 100,
  });

  // Condition check
  const conditionNode = createConditionNode("Has Users?", "data.users.length > 0", {
    x: 250,
    y: 200,
  });

  // True branch - process users
  const loopNode = createLoopNode("Process Each User", "data.users", {
    x: 100,
    y: 300,
  });
  const processAction = createActionNode("Process User", { x: 100, y: 400 });

  // False branch - create default
  const defaultAction = createActionNode("Create Default User", { x: 400, y: 300 });

  // Merge and finish
  const mergeAction = createTransformNode("Merge Results", "merge(trueResult, falseResult)", {
    x: 250,
    y: 500,
  });
  const endNode = createEndNode({ x: 250, y: 600 });

  return {
    name,
    description: "A complex workflow combining multiple patterns",
    nodes: [
      startNode,
      httpNode,
      conditionNode,
      loopNode,
      processAction,
      defaultAction,
      mergeAction,
      endNode,
    ],
    edges: [
      createEdge(startNode.id, httpNode.id),
      createEdge(httpNode.id, conditionNode.id),
      createConditionalEdge(conditionNode.id, loopNode.id, "true"),
      createConditionalEdge(conditionNode.id, defaultAction.id, "false"),
      createEdge(loopNode.id, processAction.id),
      createEdge(processAction.id, loopNode.id),
      createEdge(loopNode.id, mergeAction.id),
      createEdge(defaultAction.id, mergeAction.id),
      createEdge(mergeAction.id, endNode.id),
    ],
    status: "draft",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string" },
        options: {
          type: "object",
          properties: {
            includeDetails: { type: "boolean" },
          },
        },
      },
      required: ["userId"],
    },
    outputSchema: {
      type: "object",
      properties: {
        processedUsers: { type: "array" },
        summary: { type: "string" },
      },
    },
  };
}

// ============================================================================
// Step Template Seed Data
// ============================================================================

export interface StepTemplateSeedData {
  name: string;
  description: string;
  type: NodeType;
  icon: string;
  category: "core" | "data" | "logic" | "integration" | "ai";
  configSchema: unknown;
  defaultConfig: unknown;
  isBuiltIn: boolean;
}

export function createStepTemplates(): StepTemplateSeedData[] {
  return [
    {
      name: "Start",
      description: "Entry point for the workflow",
      type: "start",
      icon: "Play",
      category: "core",
      configSchema: { type: "object", properties: {} },
      defaultConfig: {},
      isBuiltIn: true,
    },
    {
      name: "End",
      description: "Exit point for the workflow",
      type: "end",
      icon: "Square",
      category: "core",
      configSchema: { type: "object", properties: {} },
      defaultConfig: {},
      isBuiltIn: true,
    },
    {
      name: "HTTP Request",
      description: "Make an HTTP request to an external API",
      type: "http",
      icon: "Globe",
      category: "integration",
      configSchema: {
        type: "object",
        properties: {
          url: { type: "string" },
          method: { type: "string", enum: ["GET", "POST", "PUT", "DELETE"] },
          headers: { type: "object" },
          body: { type: "object" },
        },
        required: ["url", "method"],
      },
      defaultConfig: {
        url: "",
        method: "GET",
        headers: {},
        body: null,
      },
      isBuiltIn: true,
    },
    {
      name: "Condition",
      description: "Branch workflow based on a condition",
      type: "condition",
      icon: "GitBranch",
      category: "logic",
      configSchema: {
        type: "object",
        properties: {
          expression: { type: "string" },
        },
        required: ["expression"],
      },
      defaultConfig: {
        conditionType: "expression",
        expression: "",
      },
      isBuiltIn: true,
    },
    {
      name: "Delay",
      description: "Pause workflow execution",
      type: "delay",
      icon: "Clock",
      category: "logic",
      configSchema: {
        type: "object",
        properties: {
          durationMs: { type: "number" },
        },
        required: ["durationMs"],
      },
      defaultConfig: {
        delayType: "duration",
        durationMs: 1000,
      },
      isBuiltIn: true,
    },
    {
      name: "AI Agent",
      description: "Process data using an AI model",
      type: "ai",
      icon: "Brain",
      category: "ai",
      configSchema: {
        type: "object",
        properties: {
          model: { type: "string" },
          prompt: { type: "string" },
          temperature: { type: "number" },
        },
        required: ["model", "prompt"],
      },
      defaultConfig: {
        model: "gpt-4",
        prompt: "",
        temperature: 0.7,
      },
      isBuiltIn: true,
    },
    {
      name: "Transform",
      description: "Transform data using expressions",
      type: "transform",
      icon: "Shuffle",
      category: "data",
      configSchema: {
        type: "object",
        properties: {
          expression: { type: "string" },
        },
        required: ["expression"],
      },
      defaultConfig: {
        transformType: "jmespath",
        expression: "",
      },
      isBuiltIn: true,
    },
    {
      name: "Loop",
      description: "Iterate over an array",
      type: "loop",
      icon: "Repeat",
      category: "logic",
      configSchema: {
        type: "object",
        properties: {
          iterateOver: { type: "string" },
          itemVariable: { type: "string" },
        },
        required: ["iterateOver"],
      },
      defaultConfig: {
        iterateOver: "",
        itemVariable: "item",
        indexVariable: "index",
      },
      isBuiltIn: true,
    },
  ];
}

// ============================================================================
// Execution Seed Data
// ============================================================================

export interface ExecutionSeedData {
  workflowId: Id<"workflows">;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  input: unknown;
  output?: unknown;
  error?: string;
}

export function createPendingExecution(
  workflowId: Id<"workflows">,
  input: unknown = {}
): Omit<ExecutionSeedData, "workflowId"> & { workflowId: Id<"workflows"> } {
  return {
    workflowId,
    status: "pending",
    input,
  };
}

export function createCompletedExecution(
  workflowId: Id<"workflows">,
  input: unknown = {},
  output: unknown = { success: true }
): ExecutionSeedData {
  return {
    workflowId,
    status: "completed",
    input,
    output,
  };
}

export function createFailedExecution(
  workflowId: Id<"workflows">,
  input: unknown = {},
  error = "Execution failed"
): ExecutionSeedData {
  return {
    workflowId,
    status: "failed",
    input,
    error,
  };
}

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Validate that a workflow has required structure
 */
export function validateWorkflowStructure(workflow: WorkflowSeedData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for start node
  const hasStart = workflow.nodes.some((n) => n.type === "start");
  if (!hasStart) {
    errors.push("Workflow must have a start node");
  }

  // Check for end node
  const hasEnd = workflow.nodes.some((n) => n.type === "end");
  if (!hasEnd) {
    errors.push("Workflow must have an end node");
  }

  // Check that all edges reference existing nodes
  const nodeIds = new Set(workflow.nodes.map((n) => n.id));
  for (const edge of workflow.edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge ${edge.id} references non-existent source: ${edge.source}`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge ${edge.id} references non-existent target: ${edge.target}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Find nodes by type in a workflow
 */
export function findNodesByType(
  nodes: WorkflowNode[],
  type: NodeType
): WorkflowNode[] {
  return nodes.filter((n) => n.type === type);
}

/**
 * Get outgoing edges for a node
 */
export function getOutgoingEdges(
  nodeId: string,
  edges: WorkflowEdge[]
): WorkflowEdge[] {
  return edges.filter((e) => e.source === nodeId);
}

/**
 * Get incoming edges for a node
 */
export function getIncomingEdges(
  nodeId: string,
  edges: WorkflowEdge[]
): WorkflowEdge[] {
  return edges.filter((e) => e.target === nodeId);
}

/**
 * Check if a node is reachable from start
 */
export function isNodeReachable(
  nodeId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): boolean {
  const startNode = nodes.find((n) => n.type === "start");
  if (!startNode) return false;

  const visited = new Set<string>();
  const queue = [startNode.id];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === nodeId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const outgoing = getOutgoingEdges(current, edges);
    for (const edge of outgoing) {
      if (!visited.has(edge.target)) {
        queue.push(edge.target);
      }
    }
  }

  return false;
}
