/**
 * Node Creation and Manipulation Test Suite
 *
 * Tests for:
 * - Creating all node types with correct configuration
 * - Adding nodes to workflows
 * - Updating node positions and configurations
 * - Connecting nodes with edges
 * - Validating node configurations
 * - Node reachability and graph traversal
 */

import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

// Load all Convex modules for testing
const modules = import.meta.glob("../**/*.ts");
import {
  createStartNode,
  createEndNode,
  createActionNode,
  createHttpNode,
  createConditionNode,
  createDelayNode,
  createParallelNode,
  createLoopNode,
  createAINode,
  createTransformNode,
  createMutationNode,
  createQueryNode,
  createEdge,
  createConditionalEdge,
  resetNodeIdCounter,
  resetEdgeIdCounter,
  findNodesByType,
  getOutgoingEdges,
  getIncomingEdges,
  isNodeReachable,
  WorkflowNode,
  WorkflowEdge,
} from "./testUtils";

describe("Node Creation and Manipulation", () => {
  beforeEach(() => {
    resetNodeIdCounter();
    resetEdgeIdCounter();
  });

  // ==========================================================================
  // NODE FACTORY TESTS
  // ==========================================================================

  describe("Node Factory Functions", () => {
    describe("Core Nodes", () => {
      it("should create a start node with default configuration", () => {
        const node = createStartNode();

        expect(node.type).toBe("start");
        expect(node.data.label).toBe("Start");
        expect(node.data.config).toEqual({});
        expect(node.position).toEqual({ x: 250, y: 50 });
      });

      it("should create a start node with custom position", () => {
        const node = createStartNode({ x: 100, y: 200 });

        expect(node.position).toEqual({ x: 100, y: 200 });
      });

      it("should create an end node with default configuration", () => {
        const node = createEndNode();

        expect(node.type).toBe("end");
        expect(node.data.label).toBe("End");
        expect(node.data.config).toEqual({});
      });
    });

    describe("Action Nodes", () => {
      it("should create an action node with label and config", () => {
        const node = createActionNode("Process Data", { x: 300, y: 200 }, {
          timeout: 5000,
        });

        expect(node.type).toBe("action");
        expect(node.data.label).toBe("Process Data");
        expect(node.data.config.actionType).toBe("custom");
        expect(node.data.config.timeout).toBe(5000);
      });

      it("should create an HTTP node with all parameters", () => {
        const node = createHttpNode(
          "Fetch API",
          "https://api.example.com/data",
          "POST"
        );

        expect(node.type).toBe("http");
        expect(node.data.label).toBe("Fetch API");
        expect(node.data.config.url).toBe("https://api.example.com/data");
        expect(node.data.config.method).toBe("POST");
        expect(node.data.config.headers).toEqual({});
        expect(node.data.config.timeout).toBe(30000);
      });
    });

    describe("Logic Nodes", () => {
      it("should create a condition node with expression", () => {
        const node = createConditionNode("Check Value", "input.value > 10");

        expect(node.type).toBe("condition");
        expect(node.data.label).toBe("Check Value");
        expect(node.data.config.conditionType).toBe("expression");
        expect(node.data.config.expression).toBe("input.value > 10");
      });

      it("should create a delay node with duration", () => {
        const node = createDelayNode("Wait 5 seconds", 5000);

        expect(node.type).toBe("delay");
        expect(node.data.config.delayType).toBe("duration");
        expect(node.data.config.durationMs).toBe(5000);
      });

      it("should create a parallel node with branch IDs", () => {
        const branches = ["branch-1", "branch-2", "branch-3"];
        const node = createParallelNode("Run Parallel", branches);

        expect(node.type).toBe("parallel");
        expect(node.data.config.branches).toEqual(branches);
        expect(node.data.config.waitForAll).toBe(true);
      });

      it("should create a loop node with iteration config", () => {
        const node = createLoopNode("Process Items", "data.items");

        expect(node.type).toBe("loop");
        expect(node.data.config.iterateOver).toBe("data.items");
        expect(node.data.config.itemVariable).toBe("item");
        expect(node.data.config.indexVariable).toBe("index");
        expect(node.data.config.maxIterations).toBe(100);
      });
    });

    describe("Integration Nodes", () => {
      it("should create an AI node with model and prompt", () => {
        const node = createAINode(
          "Analyze Text",
          "claude-3",
          "Analyze this: {{input}}"
        );

        expect(node.type).toBe("ai");
        expect(node.data.config.model).toBe("claude-3");
        expect(node.data.config.prompt).toBe("Analyze this: {{input}}");
        expect(node.data.config.temperature).toBe(0.7);
      });

      it("should create a transform node with expression", () => {
        const node = createTransformNode("Extract Names", "data[*].name");

        expect(node.type).toBe("transform");
        expect(node.data.config.transformType).toBe("jmespath");
        expect(node.data.config.expression).toBe("data[*].name");
      });
    });

    describe("Data Nodes", () => {
      it("should create a mutation node with name and args", () => {
        const node = createMutationNode("Save User", "users.create", {
          name: "John",
        });

        expect(node.type).toBe("mutation");
        expect(node.data.config.mutationName).toBe("users.create");
        expect(node.data.config.args).toEqual({ name: "John" });
      });

      it("should create a query node with output variable", () => {
        const node = createQueryNode("Get User", "users.get", { id: "123" });

        expect(node.type).toBe("query");
        expect(node.data.config.queryName).toBe("users.get");
        expect(node.data.config.outputVariable).toBe("queryResult");
      });
    });
  });

  // ==========================================================================
  // EDGE FACTORY TESTS
  // ==========================================================================

  describe("Edge Factory Functions", () => {
    it("should create a simple edge between nodes", () => {
      const edge = createEdge("node-1", "node-2");

      expect(edge.source).toBe("node-1");
      expect(edge.target).toBe("node-2");
      expect(edge.label).toBeUndefined();
    });

    it("should create an edge with label", () => {
      const edge = createEdge("node-1", "node-2", "next");

      expect(edge.label).toBe("next");
    });

    it("should create a conditional edge for true branch", () => {
      const edge = createConditionalEdge("condition-1", "true-action", "true");

      expect(edge.source).toBe("condition-1");
      expect(edge.target).toBe("true-action");
      expect(edge.label).toBe("true");
      expect(edge.sourceHandle).toBe("true-handle");
    });

    it("should create a conditional edge for false branch", () => {
      const edge = createConditionalEdge(
        "condition-1",
        "false-action",
        "false"
      );

      expect(edge.label).toBe("false");
      expect(edge.sourceHandle).toBe("false-handle");
    });

    it("should generate unique edge IDs", () => {
      resetEdgeIdCounter();
      const edge1 = createEdge("a", "b");
      const edge2 = createEdge("b", "c");
      const edge3 = createEdge("c", "d");

      expect(edge1.id).not.toBe(edge2.id);
      expect(edge2.id).not.toBe(edge3.id);
      expect(edge1.id).not.toBe(edge3.id);
    });
  });

  // ==========================================================================
  // NODE OPERATIONS IN WORKFLOWS
  // ==========================================================================

  describe("Adding Nodes to Workflows", () => {
    it("should add a single node to existing workflow", async () => {
      const t = convexTest(schema, modules);

      const workflowId = await t.mutation(api.workflows.createWorkflow, {
        name: "Test Workflow",
      });

      const workflow = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });
      const existingNodes = workflow?.nodes ?? [];

      // Add new action node
      const newNode = createActionNode("New Action", { x: 250, y: 200 });
      const updatedNodes = [...existingNodes, newNode];

      await t.mutation(api.workflows.updateWorkflow, {
        id: workflowId,
        nodes: updatedNodes,
      });

      const updated = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });
      expect(updated?.nodes).toHaveLength(existingNodes.length + 1);
      expect(updated?.nodes.some((n) => n.data.label === "New Action")).toBe(
        true
      );
    });

    it("should add multiple nodes of different types", async () => {
      const t = convexTest(schema, modules);

      const nodes: WorkflowNode[] = [
        createStartNode(),
        createHttpNode("Fetch", "https://api.com", "GET", { x: 250, y: 100 }),
        createConditionNode("Check", "data.valid", { x: 250, y: 200 }),
        createAINode("Process", "gpt-4", "Process: {{input}}", { x: 250, y: 300 }),
        createEndNode({ x: 250, y: 400 }),
      ];

      const workflowId = await t.mutation(api.workflows.createWorkflow, {
        name: "Multi-Node Workflow",
        nodes,
        edges: [],
      });

      const workflow = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });

      expect(workflow?.nodes).toHaveLength(5);
      expect(findNodesByType(workflow?.nodes ?? [], "http")).toHaveLength(1);
      expect(findNodesByType(workflow?.nodes ?? [], "condition")).toHaveLength(1);
      expect(findNodesByType(workflow?.nodes ?? [], "ai")).toHaveLength(1);
    });

    it("should update node position", async () => {
      const t = convexTest(schema, modules);

      const startNode = createStartNode({ x: 100, y: 100 });
      const endNode = createEndNode({ x: 100, y: 300 });

      const workflowId = await t.mutation(api.workflows.createWorkflow, {
        name: "Position Test",
        nodes: [startNode, endNode],
        edges: [createEdge(startNode.id, endNode.id)],
      });

      // Update start node position
      const workflow = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });
      const updatedNodes = workflow?.nodes.map((n) =>
        n.id === startNode.id
          ? { ...n, position: { x: 500, y: 500 } }
          : n
      );

      await t.mutation(api.workflows.updateWorkflow, {
        id: workflowId,
        nodes: updatedNodes,
      });

      const updated = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });
      const updatedStart = updated?.nodes.find((n) => n.id === startNode.id);
      expect(updatedStart?.position).toEqual({ x: 500, y: 500 });
    });

    it("should update node configuration", async () => {
      const t = convexTest(schema, modules);

      const httpNode = createHttpNode("API Call", "https://old.api.com", "GET");

      const workflowId = await t.mutation(api.workflows.createWorkflow, {
        name: "Config Update Test",
        nodes: [createStartNode(), httpNode, createEndNode()],
        edges: [],
      });

      // Update HTTP node configuration
      const workflow = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });
      const updatedNodes = workflow?.nodes.map((n) =>
        n.id === httpNode.id
          ? {
              ...n,
              data: {
                ...n.data,
                config: {
                  ...n.data.config,
                  url: "https://new.api.com",
                  method: "POST",
                },
              },
            }
          : n
      );

      await t.mutation(api.workflows.updateWorkflow, {
        id: workflowId,
        nodes: updatedNodes,
      });

      const updated = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });
      const updatedHttp = updated?.nodes.find((n) => n.id === httpNode.id);
      expect(updatedHttp?.data.config.url).toBe("https://new.api.com");
      expect(updatedHttp?.data.config.method).toBe("POST");
    });

    it("should remove a node from workflow", async () => {
      const t = convexTest(schema, modules);

      const startNode = createStartNode();
      const action1 = createActionNode("Action 1");
      const action2 = createActionNode("Action 2");
      const endNode = createEndNode();

      const workflowId = await t.mutation(api.workflows.createWorkflow, {
        name: "Remove Node Test",
        nodes: [startNode, action1, action2, endNode],
        edges: [],
      });

      // Remove action1
      const workflow = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });
      const filteredNodes = workflow?.nodes.filter((n) => n.id !== action1.id);

      await t.mutation(api.workflows.updateWorkflow, {
        id: workflowId,
        nodes: filteredNodes,
      });

      const updated = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });
      expect(updated?.nodes).toHaveLength(3);
      expect(updated?.nodes.find((n) => n.id === action1.id)).toBeUndefined();
    });
  });

  // ==========================================================================
  // EDGE OPERATIONS IN WORKFLOWS
  // ==========================================================================

  describe("Connecting Nodes with Edges", () => {
    it("should connect nodes with edges", async () => {
      const t = convexTest(schema, modules);

      const startNode = createStartNode();
      const actionNode = createActionNode("Process");
      const endNode = createEndNode();

      const edges = [
        createEdge(startNode.id, actionNode.id),
        createEdge(actionNode.id, endNode.id),
      ];

      const workflowId = await t.mutation(api.workflows.createWorkflow, {
        name: "Connected Workflow",
        nodes: [startNode, actionNode, endNode],
        edges,
      });

      const workflow = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });

      expect(workflow?.edges).toHaveLength(2);
      expect(workflow?.edges[0].source).toBe(startNode.id);
      expect(workflow?.edges[0].target).toBe(actionNode.id);
    });

    it("should create conditional branching with edges", async () => {
      const t = convexTest(schema, modules);

      const startNode = createStartNode();
      const conditionNode = createConditionNode("Check", "value > 0");
      const trueAction = createActionNode("True Path");
      const falseAction = createActionNode("False Path");
      const endNode = createEndNode();

      const edges = [
        createEdge(startNode.id, conditionNode.id),
        createConditionalEdge(conditionNode.id, trueAction.id, "true"),
        createConditionalEdge(conditionNode.id, falseAction.id, "false"),
        createEdge(trueAction.id, endNode.id),
        createEdge(falseAction.id, endNode.id),
      ];

      const workflowId = await t.mutation(api.workflows.createWorkflow, {
        name: "Branching Workflow",
        nodes: [startNode, conditionNode, trueAction, falseAction, endNode],
        edges,
      });

      const workflow = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });

      const conditionOutEdges = getOutgoingEdges(
        conditionNode.id,
        workflow?.edges ?? []
      );
      expect(conditionOutEdges).toHaveLength(2);
      expect(conditionOutEdges.some((e) => e.label === "true")).toBe(true);
      expect(conditionOutEdges.some((e) => e.label === "false")).toBe(true);
    });

    it("should add edge to existing workflow", async () => {
      const t = convexTest(schema, modules);

      const startNode = createStartNode();
      const action1 = createActionNode("Action 1", { x: 250, y: 150 });
      const action2 = createActionNode("Action 2", { x: 250, y: 250 });
      const endNode = createEndNode({ x: 250, y: 350 });

      const workflowId = await t.mutation(api.workflows.createWorkflow, {
        name: "Add Edge Test",
        nodes: [startNode, action1, action2, endNode],
        edges: [createEdge(startNode.id, action1.id)],
      });

      // Add more edges
      const workflow = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });
      const newEdges = [
        ...workflow!.edges,
        createEdge(action1.id, action2.id),
        createEdge(action2.id, endNode.id),
      ];

      await t.mutation(api.workflows.updateWorkflow, {
        id: workflowId,
        edges: newEdges,
      });

      const updated = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });
      expect(updated?.edges).toHaveLength(3);
    });

    it("should remove edge from workflow", async () => {
      const t = convexTest(schema, modules);

      const startNode = createStartNode();
      const actionNode = createActionNode("Action");
      const endNode = createEndNode();

      const edge1 = createEdge(startNode.id, actionNode.id);
      const edge2 = createEdge(actionNode.id, endNode.id);

      const workflowId = await t.mutation(api.workflows.createWorkflow, {
        name: "Remove Edge Test",
        nodes: [startNode, actionNode, endNode],
        edges: [edge1, edge2],
      });

      // Remove edge2
      await t.mutation(api.workflows.updateWorkflow, {
        id: workflowId,
        edges: [edge1],
      });

      const updated = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });
      expect(updated?.edges).toHaveLength(1);
      expect(updated?.edges[0].target).toBe(actionNode.id);
    });
  });

  // ==========================================================================
  // GRAPH TRAVERSAL TESTS
  // ==========================================================================

  describe("Graph Traversal Helpers", () => {
    it("should find nodes by type", () => {
      const nodes: WorkflowNode[] = [
        createStartNode(),
        createActionNode("Action 1"),
        createActionNode("Action 2"),
        createConditionNode("Check", "true"),
        createEndNode(),
      ];

      expect(findNodesByType(nodes, "action")).toHaveLength(2);
      expect(findNodesByType(nodes, "condition")).toHaveLength(1);
      expect(findNodesByType(nodes, "start")).toHaveLength(1);
      expect(findNodesByType(nodes, "loop")).toHaveLength(0);
    });

    it("should get outgoing edges for a node", () => {
      const edges: WorkflowEdge[] = [
        createEdge("node-1", "node-2"),
        createEdge("node-1", "node-3"),
        createEdge("node-2", "node-4"),
      ];

      const outgoing = getOutgoingEdges("node-1", edges);
      expect(outgoing).toHaveLength(2);
      expect(outgoing.every((e) => e.source === "node-1")).toBe(true);
    });

    it("should get incoming edges for a node", () => {
      const edges: WorkflowEdge[] = [
        createEdge("node-1", "node-3"),
        createEdge("node-2", "node-3"),
        createEdge("node-3", "node-4"),
      ];

      const incoming = getIncomingEdges("node-3", edges);
      expect(incoming).toHaveLength(2);
      expect(incoming.every((e) => e.target === "node-3")).toBe(true);
    });

    it("should check node reachability from start", () => {
      const startNode = createStartNode();
      const action1 = createActionNode("Action 1");
      const action2 = createActionNode("Action 2");
      const orphan = createActionNode("Orphan");
      const endNode = createEndNode();

      const nodes = [startNode, action1, action2, orphan, endNode];
      const edges = [
        createEdge(startNode.id, action1.id),
        createEdge(action1.id, action2.id),
        createEdge(action2.id, endNode.id),
        // orphan has no incoming edge
      ];

      expect(isNodeReachable(action1.id, nodes, edges)).toBe(true);
      expect(isNodeReachable(action2.id, nodes, edges)).toBe(true);
      expect(isNodeReachable(endNode.id, nodes, edges)).toBe(true);
      expect(isNodeReachable(orphan.id, nodes, edges)).toBe(false);
    });
  });

  // ==========================================================================
  // NODE TYPE SPECIFIC TESTS
  // ==========================================================================

  describe("Node Type Specific Behavior", () => {
    it("should handle HTTP node with all HTTP methods", async () => {
      const t = convexTest(schema, modules);

      const methods = ["GET", "POST", "PUT", "DELETE"] as const;
      const httpNodes = methods.map((method, i) =>
        createHttpNode(`${method} Request`, `https://api.com/${method.toLowerCase()}`, method, {
          x: 250,
          y: 100 + i * 100,
        })
      );

      const workflowId = await t.mutation(api.workflows.createWorkflow, {
        name: "HTTP Methods Test",
        nodes: [createStartNode(), ...httpNodes, createEndNode()],
        edges: [],
      });

      const workflow = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });
      const httpNodesInWorkflow = findNodesByType(workflow?.nodes ?? [], "http");

      expect(httpNodesInWorkflow).toHaveLength(4);
      methods.forEach((method) => {
        expect(
          httpNodesInWorkflow.some((n) => n.data.config.method === method)
        ).toBe(true);
      });
    });

    it("should handle AI node with different models", async () => {
      const t = convexTest(schema, modules);

      const models = ["gpt-4", "gpt-3.5-turbo", "claude-3", "gemini-pro"];
      const aiNodes = models.map((model, i) =>
        createAINode(`${model} Agent`, model, `Process with ${model}`, {
          x: 250,
          y: 100 + i * 100,
        })
      );

      const workflowId = await t.mutation(api.workflows.createWorkflow, {
        name: "AI Models Test",
        nodes: [createStartNode(), ...aiNodes, createEndNode()],
        edges: [],
      });

      const workflow = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });
      const aiNodesInWorkflow = findNodesByType(workflow?.nodes ?? [], "ai");

      expect(aiNodesInWorkflow).toHaveLength(4);
      models.forEach((model) => {
        expect(
          aiNodesInWorkflow.some((n) => n.data.config.model === model)
        ).toBe(true);
      });
    });

    it("should handle nested parallel execution", async () => {
      const t = convexTest(schema, modules);

      // Create parallel tasks
      const task1 = createActionNode("Task A", { x: 100, y: 150 });
      const task2 = createActionNode("Task B", { x: 300, y: 150 });
      const task3 = createActionNode("Task C", { x: 500, y: 150 });

      const parallelNode = createParallelNode(
        "Run All",
        [task1.id, task2.id, task3.id],
        { x: 300, y: 250 }
      );

      const workflowId = await t.mutation(api.workflows.createWorkflow, {
        name: "Parallel Test",
        nodes: [
          createStartNode(),
          task1,
          task2,
          task3,
          parallelNode,
          createEndNode(),
        ],
        edges: [],
      });

      const workflow = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });
      const parallel = workflow?.nodes.find((n) => n.type === "parallel");

      expect(parallel?.data.config.branches).toHaveLength(3);
      expect(parallel?.data.config.branches).toContain(task1.id);
      expect(parallel?.data.config.branches).toContain(task2.id);
      expect(parallel?.data.config.branches).toContain(task3.id);
    });

    it("should handle loop with iteration variables", async () => {
      const t = convexTest(schema, modules);

      const loopNode = createLoopNode("Process Items", "input.items");

      const workflowId = await t.mutation(api.workflows.createWorkflow, {
        name: "Loop Test",
        nodes: [createStartNode(), loopNode, createEndNode()],
        edges: [],
      });

      const workflow = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });
      const loop = workflow?.nodes.find((n) => n.type === "loop");

      expect(loop?.data.config.iterateOver).toBe("input.items");
      expect(loop?.data.config.itemVariable).toBe("item");
      expect(loop?.data.config.indexVariable).toBe("index");
    });
  });

  // ==========================================================================
  // UNIQUE ID GENERATION TESTS
  // ==========================================================================

  describe("Unique ID Generation", () => {
    it("should generate unique node IDs", () => {
      resetNodeIdCounter();

      const nodes = [
        createStartNode(),
        createActionNode("A"),
        createActionNode("B"),
        createConditionNode("C", "true"),
        createEndNode(),
      ];

      const ids = nodes.map((n) => n.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should generate unique edge IDs", () => {
      resetEdgeIdCounter();

      const edges = [
        createEdge("a", "b"),
        createEdge("b", "c"),
        createEdge("c", "d"),
        createConditionalEdge("d", "e", "true"),
        createConditionalEdge("d", "f", "false"),
      ];

      const ids = edges.map((e) => e.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should reset ID counters properly", () => {
      // Generate some IDs
      createStartNode();
      createActionNode("Test");
      createEdge("a", "b");

      // Reset
      resetNodeIdCounter();
      resetEdgeIdCounter();

      // First IDs should be fresh
      const newNode = createStartNode();
      const newEdge = createEdge("x", "y");

      expect(newNode.id).toBe("start-1");
      expect(newEdge.id).toBe("edge-1");
    });
  });
});
