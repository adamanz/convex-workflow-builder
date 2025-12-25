import { useQuery, useMutation } from 'convex/react';
import { useCallback, useMemo, useState } from 'react';
import { api } from '../../convex/_generated/api';
import type { Id, Doc } from '../../convex/_generated/dataModel';
import type { Workflow, WorkflowNode, WorkflowEdge } from '../types/workflow';

/**
 * Workflow state returned by the useWorkflow hook
 */
export interface WorkflowState {
  // Workflow data
  workflow: Doc<'workflows'> | null | undefined;
  isLoading: boolean;
  error: string | null;

  // Computed values
  nodeCount: number;
  edgeCount: number;
  hasUnsavedChanges: boolean;
  isValid: boolean;
  validationErrors: string[];

  // CRUD operations
  save: (updates: WorkflowUpdates) => Promise<void>;
  create: (data: WorkflowCreateData) => Promise<Id<'workflows'>>;
  remove: () => Promise<void>;
  duplicate: (newName?: string) => Promise<Id<'workflows'>>;

  // Status operations
  publish: () => Promise<void>;
  archive: () => Promise<void>;

  // Node operations
  addNode: (node: WorkflowNode) => Promise<void>;
  updateNode: (nodeId: string, updates: Partial<WorkflowNode>) => Promise<void>;
  removeNode: (nodeId: string) => Promise<void>;

  // Edge operations
  addEdge: (edge: WorkflowEdge) => Promise<void>;
  removeEdge: (edgeId: string) => Promise<void>;

  // Optimistic update state
  optimisticNodes: WorkflowNode[] | null;
  optimisticEdges: WorkflowEdge[] | null;
  clearOptimistic: () => void;
}

/**
 * Data for creating a new workflow
 */
export interface WorkflowCreateData {
  name: string;
  description?: string;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
}

/**
 * Data for updating a workflow
 */
export interface WorkflowUpdates {
  name?: string;
  description?: string;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  status?: 'draft' | 'published' | 'archived';
}

/**
 * Hook options
 */
export interface UseWorkflowOptions {
  /** Enable optimistic updates */
  optimistic?: boolean;
  /** Callback when workflow is saved */
  onSave?: () => void;
  /** Callback when save fails */
  onError?: (error: Error) => void;
}

/**
 * Custom hook for managing a single workflow
 *
 * Provides real-time updates from Convex, CRUD operations,
 * and optimistic updates for better UX.
 */
export function useWorkflow(
  workflowId: string | null,
  options: UseWorkflowOptions = {}
): WorkflowState {
  const { optimistic = true, onSave, onError } = options;

  // Optimistic state for instant UI feedback
  const [optimisticNodes, setOptimisticNodes] = useState<WorkflowNode[] | null>(null);
  const [optimisticEdges, setOptimisticEdges] = useState<WorkflowEdge[] | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Query workflow from Convex
  const workflow = useQuery(
    api.workflows.getWorkflow,
    workflowId ? { id: workflowId as Id<'workflows'> } : 'skip'
  );

  // Mutations
  const createMutation = useMutation(api.workflows.createWorkflow);
  const updateMutation = useMutation(api.workflows.updateWorkflow);
  const deleteMutation = useMutation(api.workflows.deleteWorkflow);
  const duplicateMutation = useMutation(api.workflows.duplicateWorkflow);
  const publishMutation = useMutation(api.workflows.publishWorkflow);
  const archiveMutation = useMutation(api.workflows.archiveWorkflow);

  // Compute current nodes and edges (with optimistic updates)
  const currentNodes = useMemo(() => {
    if (optimistic && optimisticNodes !== null) {
      return optimisticNodes;
    }
    return workflow?.nodes ?? [];
  }, [workflow?.nodes, optimisticNodes, optimistic]);

  const currentEdges = useMemo(() => {
    if (optimistic && optimisticEdges !== null) {
      return optimisticEdges;
    }
    return workflow?.edges ?? [];
  }, [workflow?.edges, optimisticEdges, optimistic]);

  // Validate workflow structure
  const validationResult = useMemo(() => {
    const errors: string[] = [];

    if (currentNodes.length === 0) {
      errors.push('Workflow must have at least one node');
    }

    const hasStart = currentNodes.some((n) => n.type === 'start');
    const hasEnd = currentNodes.some((n) => n.type === 'end');

    if (!hasStart) {
      errors.push('Workflow must have a Start node');
    }
    if (!hasEnd) {
      errors.push('Workflow must have an End node');
    }

    // Check for orphan nodes (no connections)
    const connectedNodeIds = new Set<string>();
    for (const edge of currentEdges) {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    }

    const orphanNodes = currentNodes.filter(
      (n) => n.type !== 'start' && n.type !== 'end' && !connectedNodeIds.has(n.id)
    );

    if (orphanNodes.length > 0) {
      errors.push(`${orphanNodes.length} node(s) are not connected`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [currentNodes, currentEdges]);

  // Clear optimistic state
  const clearOptimistic = useCallback(() => {
    setOptimisticNodes(null);
    setOptimisticEdges(null);
    setHasUnsavedChanges(false);
  }, []);

  // Handle mutation errors
  const handleError = useCallback(
    (err: unknown, operation: string) => {
      const errorMessage = err instanceof Error ? err.message : `Failed to ${operation}`;
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      console.error(`${operation} failed:`, err);
    },
    [onError]
  );

  // Create a new workflow
  const create = useCallback(
    async (data: WorkflowCreateData): Promise<Id<'workflows'>> => {
      try {
        setError(null);
        const id = await createMutation({
          name: data.name,
          description: data.description,
          nodes: data.nodes,
          edges: data.edges,
        });
        return id;
      } catch (err) {
        handleError(err, 'create workflow');
        throw err;
      }
    },
    [createMutation, handleError]
  );

  // Save workflow updates
  const save = useCallback(
    async (updates: WorkflowUpdates): Promise<void> => {
      if (!workflowId) {
        throw new Error('No workflow ID provided');
      }

      try {
        setError(null);

        // Apply optimistic update
        if (optimistic) {
          if (updates.nodes) setOptimisticNodes(updates.nodes);
          if (updates.edges) setOptimisticEdges(updates.edges);
        }

        await updateMutation({
          id: workflowId as Id<'workflows'>,
          ...updates,
        });

        // Clear optimistic state after successful save
        clearOptimistic();
        onSave?.();
      } catch (err) {
        // Revert optimistic update on error
        clearOptimistic();
        handleError(err, 'save workflow');
        throw err;
      }
    },
    [workflowId, updateMutation, optimistic, clearOptimistic, onSave, handleError]
  );

  // Delete workflow
  const remove = useCallback(async (): Promise<void> => {
    if (!workflowId) {
      throw new Error('No workflow ID provided');
    }

    try {
      setError(null);
      await deleteMutation({ id: workflowId as Id<'workflows'> });
    } catch (err) {
      handleError(err, 'delete workflow');
      throw err;
    }
  }, [workflowId, deleteMutation, handleError]);

  // Duplicate workflow
  const duplicate = useCallback(
    async (newName?: string): Promise<Id<'workflows'>> => {
      if (!workflowId) {
        throw new Error('No workflow ID provided');
      }

      try {
        setError(null);
        const id = await duplicateMutation({
          id: workflowId as Id<'workflows'>,
          name: newName,
        });
        return id;
      } catch (err) {
        handleError(err, 'duplicate workflow');
        throw err;
      }
    },
    [workflowId, duplicateMutation, handleError]
  );

  // Publish workflow
  const publish = useCallback(async (): Promise<void> => {
    if (!workflowId) {
      throw new Error('No workflow ID provided');
    }

    try {
      setError(null);
      await publishMutation({ id: workflowId as Id<'workflows'> });
    } catch (err) {
      handleError(err, 'publish workflow');
      throw err;
    }
  }, [workflowId, publishMutation, handleError]);

  // Archive workflow
  const archive = useCallback(async (): Promise<void> => {
    if (!workflowId) {
      throw new Error('No workflow ID provided');
    }

    try {
      setError(null);
      await archiveMutation({ id: workflowId as Id<'workflows'> });
    } catch (err) {
      handleError(err, 'archive workflow');
      throw err;
    }
  }, [workflowId, archiveMutation, handleError]);

  // Add a node
  const addNode = useCallback(
    async (node: WorkflowNode): Promise<void> => {
      const newNodes = [...currentNodes, node];

      if (optimistic) {
        setOptimisticNodes(newNodes);
        setHasUnsavedChanges(true);
      }

      await save({ nodes: newNodes });
    },
    [currentNodes, optimistic, save]
  );

  // Update a node
  const updateNode = useCallback(
    async (nodeId: string, updates: Partial<WorkflowNode>): Promise<void> => {
      const newNodes = currentNodes.map((node) =>
        node.id === nodeId ? { ...node, ...updates } : node
      );

      if (optimistic) {
        setOptimisticNodes(newNodes);
        setHasUnsavedChanges(true);
      }

      await save({ nodes: newNodes });
    },
    [currentNodes, optimistic, save]
  );

  // Remove a node
  const removeNode = useCallback(
    async (nodeId: string): Promise<void> => {
      const newNodes = currentNodes.filter((node) => node.id !== nodeId);
      // Also remove edges connected to this node
      const newEdges = currentEdges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      );

      if (optimistic) {
        setOptimisticNodes(newNodes);
        setOptimisticEdges(newEdges);
        setHasUnsavedChanges(true);
      }

      await save({ nodes: newNodes, edges: newEdges });
    },
    [currentNodes, currentEdges, optimistic, save]
  );

  // Add an edge
  const addEdge = useCallback(
    async (edge: WorkflowEdge): Promise<void> => {
      const newEdges = [...currentEdges, edge];

      if (optimistic) {
        setOptimisticEdges(newEdges);
        setHasUnsavedChanges(true);
      }

      await save({ edges: newEdges });
    },
    [currentEdges, optimistic, save]
  );

  // Remove an edge
  const removeEdge = useCallback(
    async (edgeId: string): Promise<void> => {
      const newEdges = currentEdges.filter((edge) => edge.id !== edgeId);

      if (optimistic) {
        setOptimisticEdges(newEdges);
        setHasUnsavedChanges(true);
      }

      await save({ edges: newEdges });
    },
    [currentEdges, optimistic, save]
  );

  return {
    // Workflow data
    workflow,
    isLoading: workflow === undefined,
    error,

    // Computed values
    nodeCount: currentNodes.length,
    edgeCount: currentEdges.length,
    hasUnsavedChanges,
    isValid: validationResult.isValid,
    validationErrors: validationResult.errors,

    // CRUD operations
    save,
    create,
    remove,
    duplicate,

    // Status operations
    publish,
    archive,

    // Node operations
    addNode,
    updateNode,
    removeNode,

    // Edge operations
    addEdge,
    removeEdge,

    // Optimistic update state
    optimisticNodes,
    optimisticEdges,
    clearOptimistic,
  };
}

/**
 * Hook for listing workflows
 */
export function useWorkflowList(status?: 'draft' | 'published' | 'archived') {
  const workflows = useQuery(api.workflows.listWorkflows, { status });

  return {
    workflows: workflows ?? [],
    isLoading: workflows === undefined,
  };
}

/**
 * Hook for workflow creation form
 */
export function useCreateWorkflow() {
  const createMutation = useMutation(api.workflows.createWorkflow);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(
    async (data: WorkflowCreateData): Promise<Id<'workflows'>> => {
      try {
        setIsCreating(true);
        setError(null);
        const id = await createMutation({
          name: data.name,
          description: data.description,
          nodes: data.nodes,
          edges: data.edges,
        });
        return id;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create workflow';
        setError(message);
        throw err;
      } finally {
        setIsCreating(false);
      }
    },
    [createMutation]
  );

  return {
    create,
    isCreating,
    error,
  };
}
