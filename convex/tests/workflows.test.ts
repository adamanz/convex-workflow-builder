/**
 * Workflow CRUD Operations Test Suite
 *
 * Tests for:
 * - Creating workflows with various configurations
 * - Updating workflow metadata, nodes, and edges
 * - Deleting workflows and cascading deletes
 * - Listing and filtering workflows
 * - Publishing and archiving workflows
 * - Duplicating workflows
 */

import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

// Load all Convex modules for testing
const modules = import.meta.glob("../**/*.ts");
import {
  createMinimalWorkflow,
  createLinearWorkflow,
  createConditionalWorkflow,
  createComplexWorkflow,
  createStartNode,
  createEndNode,
  createActionNode,
  createEdge,
  resetNodeIdCounter,
  resetEdgeIdCounter,
  validateWorkflowStructure,
} from "./testUtils";

describe("Workflow CRUD Operations", () => {
  beforeEach(() => {
    resetNodeIdCounter();
    resetEdgeIdCounter();
  });

  // ==========================================================================
  // CREATE WORKFLOW TESTS
  // ==========================================================================

  describe("createWorkflow", () => {
    it("should create a workflow with default start/end nodes", async () => {
      const t = convexTest(schema, modules);

      const workflowId = await t.mutation(api.workflows.createWorkflow, {
        name: "Test Workflow",
        description: "A test workflow",
      });

      expect(workflowId).toBeDefined();

      const workflow = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });

      expect(workflow).not.toBeNull();
      expect(workflow?.name).toBe("Test Workflow");
      expect(workflow?.description).toBe("A test workflow");
      expect(workflow?.status).toBe("draft");
      expect(workflow?.version).toBe(1);
      expect(workflow?.nodes).toHaveLength(2);
      expect(workflow?.nodes.some((n) => n.type === "start")).toBe(true);
      expect(workflow?.nodes.some((n) => n.type === "end")).toBe(true);
    });

    it("should create a workflow with custom nodes", async () => {
      const t = convexTest(schema, modules);
      const seedData = createLinearWorkflow("Custom Workflow", [
        "Step 1",
        "Step 2",
      ]);

      const workflowId = await t.mutation(api.workflows.createWorkflow, {
        name: seedData.name,
        description: seedData.description,
        nodes: seedData.nodes,
        edges: seedData.edges,
      });

      const workflow = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });

      expect(workflow?.nodes).toHaveLength(4); // start + 2 actions + end
      expect(workflow?.edges).toHaveLength(3);
    });

    it("should create workflow with input/output schemas", async () => {
      const t = convexTest(schema, modules);
      const inputSchema = {
        type: "object",
        properties: { userId: { type: "string" } },
        required: ["userId"],
      };
      const outputSchema = {
        type: "object",
        properties: { result: { type: "boolean" } },
      };

      const workflowId = await t.mutation(api.workflows.createWorkflow, {
        name: "Schema Workflow",
        inputSchema,
        outputSchema,
      });

      const workflow = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });

      expect(workflow?.inputSchema).toEqual(inputSchema);
      expect(workflow?.outputSchema).toEqual(outputSchema);
    });

    it("should set correct timestamps on creation", async () => {
      const t = convexTest(schema, modules);
      const beforeCreate = Date.now();

      const workflowId = await t.mutation(api.workflows.createWorkflow, {
        name: "Timestamp Test",
      });

      const afterCreate = Date.now();
      const workflow = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });

      expect(workflow?.createdAt).toBeGreaterThanOrEqual(beforeCreate);
      expect(workflow?.createdAt).toBeLessThanOrEqual(afterCreate);
      expect(workflow?.updatedAt).toBe(workflow?.createdAt);
    });
  });

  // ==========================================================================
  // UPDATE WORKFLOW TESTS
  // ==========================================================================

  describe("updateWorkflow", () => {
    it("should update workflow name and description", async () => {
      const t = convexTest(schema, modules);

      const workflowId = await t.mutation(api.workflows.createWorkflow, {
        name: "Original Name",
        description: "Original description",
      });

      await t.mutation(api.workflows.updateWorkflow, {
        id: workflowId,
        name: "Updated Name",
        description: "Updated description",
      });

      const workflow = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });

      expect(workflow?.name).toBe("Updated Name");
      expect(workflow?.description).toBe("Updated description");
    });

    it("should increment version when updating nodes", async () => {
      const t = convexTest(schema, modules);

      const workflowId = await t.mutation(api.workflows.createWorkflow, {
        name: "Version Test",
      });

      const initialWorkflow = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });
      expect(initialWorkflow?.version).toBe(1);

      const newNodes = [
        createStartNode(),
        createActionNode("New Action"),
        createEndNode(),
      ];

      await t.mutation(api.workflows.updateWorkflow, {
        id: workflowId,
        nodes: newNodes,
      });

      const updatedWorkflow = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });
      expect(updatedWorkflow?.version).toBe(2);
    });

    it("should increment version when updating edges", async () => {
      const t = convexTest(schema, modules);
      const seedData = createMinimalWorkflow();

      const workflowId = await t.mutation(api.workflows.createWorkflow, {
        name: seedData.name,
        nodes: seedData.nodes,
        edges: [],
      });

      await t.mutation(api.workflows.updateWorkflow, {
        id: workflowId,
        edges: seedData.edges,
      });

      const workflow = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });
      expect(workflow?.version).toBe(2);
    });

    it("should not increment version for metadata-only updates", async () => {
      const t = convexTest(schema, modules);

      const workflowId = await t.mutation(api.workflows.createWorkflow, {
        name: "Version Test",
      });

      await t.mutation(api.workflows.updateWorkflow, {
        id: workflowId,
        description: "New description",
      });

      const workflow = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });
      expect(workflow?.version).toBe(1);
    });

    it("should update timestamp on every update", async () => {
      const t = convexTest(schema, modules);

      const workflowId = await t.mutation(api.workflows.createWorkflow, {
        name: "Timestamp Test",
      });

      const initialWorkflow = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });
      const initialUpdatedAt = initialWorkflow?.updatedAt;

      // Wait a tiny bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await t.mutation(api.workflows.updateWorkflow, {
        id: workflowId,
        name: "Updated Name",
      });

      const updatedWorkflow = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });
      expect(updatedWorkflow?.updatedAt).toBeGreaterThan(initialUpdatedAt!);
    });

    it("should throw error for non-existent workflow", async () => {
      const t = convexTest(schema, modules);

      // Create a workflow to get a valid ID format, then use a fake one
      const validId = await t.mutation(api.workflows.createWorkflow, {
        name: "Temp",
      });

      await expect(
        t.mutation(api.workflows.updateWorkflow, {
          id: validId,
          name: "Updated",
        })
      ).resolves.toBeDefined();

      // Delete it first
      await t.mutation(api.workflows.deleteWorkflow, { id: validId });

      await expect(
        t.mutation(api.workflows.updateWorkflow, {
          id: validId,
          name: "Should Fail",
        })
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // DELETE WORKFLOW TESTS
  // ==========================================================================

  describe("deleteWorkflow", () => {
    it("should delete a workflow", async () => {
      const t = convexTest(schema, modules);

      const workflowId = await t.mutation(api.workflows.createWorkflow, {
        name: "To Delete",
      });

      await t.mutation(api.workflows.deleteWorkflow, { id: workflowId });

      const workflow = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });
      expect(workflow).toBeNull();
    });

    it("should delete associated executions when deleting workflow", async () => {
      const t = convexTest(schema, modules);

      const workflowId = await t.mutation(api.workflows.createWorkflow, {
        name: "With Executions",
      });

      // Create some executions
      await t.mutation(api.executions.executeWorkflow, {
        workflowId,
        input: { test: true },
      });

      // Verify executions exist
      const executionsBefore = await t.query(api.executions.listExecutions, {
        workflowId,
      });
      expect(executionsBefore.length).toBeGreaterThan(0);

      // Delete workflow
      await t.mutation(api.workflows.deleteWorkflow, { id: workflowId });

      // Executions should be deleted too
      const executionsAfter = await t.query(api.executions.listExecutions, {
        workflowId,
      });
      expect(executionsAfter).toHaveLength(0);
    });

    it("should throw error when deleting non-existent workflow", async () => {
      const t = convexTest(schema, modules);

      const workflowId = await t.mutation(api.workflows.createWorkflow, {
        name: "Temp",
      });
      await t.mutation(api.workflows.deleteWorkflow, { id: workflowId });

      await expect(
        t.mutation(api.workflows.deleteWorkflow, { id: workflowId })
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // LIST WORKFLOWS TESTS
  // ==========================================================================

  describe("listWorkflows", () => {
    it("should list all workflows", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.workflows.createWorkflow, { name: "Workflow 1" });
      await t.mutation(api.workflows.createWorkflow, { name: "Workflow 2" });
      await t.mutation(api.workflows.createWorkflow, { name: "Workflow 3" });

      const workflows = await t.query(api.workflows.listWorkflows, {});

      expect(workflows).toHaveLength(3);
    });

    it("should filter workflows by status", async () => {
      const t = convexTest(schema, modules);

      const id1 = await t.mutation(api.workflows.createWorkflow, {
        name: "Draft 1",
      });
      const id2 = await t.mutation(api.workflows.createWorkflow, {
        name: "Draft 2",
      });

      // Publish one workflow
      await t.mutation(api.workflows.publishWorkflow, { id: id1 });

      const draftWorkflows = await t.query(api.workflows.listWorkflows, {
        status: "draft",
      });
      expect(draftWorkflows).toHaveLength(1);
      expect(draftWorkflows[0].name).toBe("Draft 2");

      const publishedWorkflows = await t.query(api.workflows.listWorkflows, {
        status: "published",
      });
      expect(publishedWorkflows).toHaveLength(1);
      expect(publishedWorkflows[0].name).toBe("Draft 1");
    });

    it("should respect limit parameter", async () => {
      const t = convexTest(schema, modules);

      for (let i = 0; i < 10; i++) {
        await t.mutation(api.workflows.createWorkflow, {
          name: `Workflow ${i}`,
        });
      }

      const limitedWorkflows = await t.query(api.workflows.listWorkflows, {
        limit: 5,
      });
      expect(limitedWorkflows).toHaveLength(5);
    });

    it("should include execution stats", async () => {
      const t = convexTest(schema, modules);

      const workflowId = await t.mutation(api.workflows.createWorkflow, {
        name: "With Stats",
      });

      // Create some executions
      await t.mutation(api.executions.executeWorkflow, {
        workflowId,
        input: {},
      });
      await t.mutation(api.executions.executeWorkflow, {
        workflowId,
        input: {},
      });

      const workflows = await t.query(api.workflows.listWorkflows, {});
      const workflow = workflows.find((w) => w._id === workflowId);

      expect(workflow?.executionStats).toBeDefined();
      expect(workflow?.executionStats.total).toBe(2);
    });
  });

  // ==========================================================================
  // GET WORKFLOW TESTS
  // ==========================================================================

  describe("getWorkflow", () => {
    it("should return workflow with full details", async () => {
      const t = convexTest(schema, modules);
      const seedData = createConditionalWorkflow("Detailed Workflow");

      const workflowId = await t.mutation(api.workflows.createWorkflow, {
        name: seedData.name,
        description: seedData.description,
        nodes: seedData.nodes,
        edges: seedData.edges,
      });

      const workflow = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });

      expect(workflow).not.toBeNull();
      expect(workflow?.name).toBe("Detailed Workflow");
      expect(workflow?.nodes).toHaveLength(seedData.nodes.length);
      expect(workflow?.edges).toHaveLength(seedData.edges.length);
    });

    it("should include recent executions", async () => {
      const t = convexTest(schema, modules);

      const workflowId = await t.mutation(api.workflows.createWorkflow, {
        name: "With Executions",
      });

      // Create executions
      await t.mutation(api.executions.executeWorkflow, {
        workflowId,
        input: { run: 1 },
      });
      await t.mutation(api.executions.executeWorkflow, {
        workflowId,
        input: { run: 2 },
      });

      const workflow = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });

      expect(workflow?.recentExecutions).toHaveLength(2);
    });

    it("should return null for non-existent workflow", async () => {
      const t = convexTest(schema, modules);

      const workflowId = await t.mutation(api.workflows.createWorkflow, {
        name: "Temp",
      });
      await t.mutation(api.workflows.deleteWorkflow, { id: workflowId });

      const workflow = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });
      expect(workflow).toBeNull();
    });
  });

  // ==========================================================================
  // PUBLISH WORKFLOW TESTS
  // ==========================================================================

  describe("publishWorkflow", () => {
    it("should publish a valid workflow", async () => {
      const t = convexTest(schema, modules);
      const seedData = createMinimalWorkflow();

      const workflowId = await t.mutation(api.workflows.createWorkflow, {
        name: seedData.name,
        nodes: seedData.nodes,
        edges: seedData.edges,
      });

      await t.mutation(api.workflows.publishWorkflow, { id: workflowId });

      const workflow = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });
      expect(workflow?.status).toBe("published");
    });

    it("should reject workflow without start node", async () => {
      const t = convexTest(schema, modules);

      const workflowId = await t.mutation(api.workflows.createWorkflow, {
        name: "No Start",
        nodes: [createEndNode()],
        edges: [],
      });

      await expect(
        t.mutation(api.workflows.publishWorkflow, { id: workflowId })
      ).rejects.toThrow("must have both Start and End nodes");
    });

    it("should reject workflow without end node", async () => {
      const t = convexTest(schema, modules);

      const workflowId = await t.mutation(api.workflows.createWorkflow, {
        name: "No End",
        nodes: [createStartNode()],
        edges: [],
      });

      await expect(
        t.mutation(api.workflows.publishWorkflow, { id: workflowId })
      ).rejects.toThrow("must have both Start and End nodes");
    });
  });

  // ==========================================================================
  // ARCHIVE WORKFLOW TESTS
  // ==========================================================================

  describe("archiveWorkflow", () => {
    it("should archive a workflow", async () => {
      const t = convexTest(schema, modules);

      const workflowId = await t.mutation(api.workflows.createWorkflow, {
        name: "To Archive",
      });

      await t.mutation(api.workflows.archiveWorkflow, { id: workflowId });

      const workflow = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });
      expect(workflow?.status).toBe("archived");
    });

    it("should update timestamp when archiving", async () => {
      const t = convexTest(schema, modules);

      const workflowId = await t.mutation(api.workflows.createWorkflow, {
        name: "Archive Timestamp",
      });

      const beforeArchive = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      await t.mutation(api.workflows.archiveWorkflow, { id: workflowId });

      const afterArchive = await t.query(api.workflows.getWorkflow, {
        id: workflowId,
      });

      expect(afterArchive?.updatedAt).toBeGreaterThan(beforeArchive?.updatedAt!);
    });
  });

  // ==========================================================================
  // DUPLICATE WORKFLOW TESTS
  // ==========================================================================

  describe("duplicateWorkflow", () => {
    it("should duplicate a workflow with new name", async () => {
      const t = convexTest(schema, modules);
      const seedData = createComplexWorkflow("Original");

      const originalId = await t.mutation(api.workflows.createWorkflow, {
        name: seedData.name,
        description: seedData.description,
        nodes: seedData.nodes,
        edges: seedData.edges,
        inputSchema: seedData.inputSchema,
        outputSchema: seedData.outputSchema,
      });

      const duplicateId = await t.mutation(api.workflows.duplicateWorkflow, {
        id: originalId,
        name: "Duplicated Workflow",
      });

      expect(duplicateId).not.toBe(originalId);

      const duplicate = await t.query(api.workflows.getWorkflow, {
        id: duplicateId,
      });

      expect(duplicate?.name).toBe("Duplicated Workflow");
      expect(duplicate?.description).toBe(seedData.description);
      expect(duplicate?.nodes).toHaveLength(seedData.nodes.length);
      expect(duplicate?.edges).toHaveLength(seedData.edges.length);
      expect(duplicate?.inputSchema).toEqual(seedData.inputSchema);
      expect(duplicate?.status).toBe("draft"); // Always starts as draft
      expect(duplicate?.version).toBe(1); // Fresh version
    });

    it("should use default name if not provided", async () => {
      const t = convexTest(schema, modules);

      const originalId = await t.mutation(api.workflows.createWorkflow, {
        name: "Original Workflow",
      });

      const duplicateId = await t.mutation(api.workflows.duplicateWorkflow, {
        id: originalId,
      });

      const duplicate = await t.query(api.workflows.getWorkflow, {
        id: duplicateId,
      });

      expect(duplicate?.name).toBe("Original Workflow (Copy)");
    });

    it("should throw error for non-existent source workflow", async () => {
      const t = convexTest(schema, modules);

      const tempId = await t.mutation(api.workflows.createWorkflow, {
        name: "Temp",
      });
      await t.mutation(api.workflows.deleteWorkflow, { id: tempId });

      await expect(
        t.mutation(api.workflows.duplicateWorkflow, { id: tempId })
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // WORKFLOW VALIDATION TESTS
  // ==========================================================================

  describe("Workflow Structure Validation", () => {
    it("should validate minimal workflow structure", () => {
      const workflow = createMinimalWorkflow();
      const validation = validateWorkflowStructure(workflow);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should validate complex workflow structure", () => {
      const workflow = createComplexWorkflow();
      const validation = validateWorkflowStructure(workflow);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should catch missing start node", () => {
      const workflow = {
        name: "Invalid",
        nodes: [createEndNode()],
        edges: [],
      };
      const validation = validateWorkflowStructure(workflow);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain("Workflow must have a start node");
    });

    it("should catch missing end node", () => {
      const workflow = {
        name: "Invalid",
        nodes: [createStartNode()],
        edges: [],
      };
      const validation = validateWorkflowStructure(workflow);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain("Workflow must have an end node");
    });

    it("should catch invalid edge references", () => {
      const startNode = createStartNode();
      const workflow = {
        name: "Invalid",
        nodes: [startNode, createEndNode()],
        edges: [createEdge(startNode.id, "non-existent-node")],
      };
      const validation = validateWorkflowStructure(workflow);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("non-existent"))).toBe(
        true
      );
    });
  });
});
