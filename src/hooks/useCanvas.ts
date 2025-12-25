import { useCallback, useState, useMemo, useRef, useEffect } from 'react';
import {
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Connection,
  addEdge as rfAddEdge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  XYPosition,
  Viewport,
  ReactFlowInstance,
} from '@xyflow/react';
import type { WorkflowNode, WorkflowEdge } from '../types/workflow';
import { generateId } from '../lib/utils';

/**
 * History entry for undo/redo
 */
interface HistoryEntry {
  nodes: Node[];
  edges: Edge[];
  timestamp: number;
}

/**
 * Canvas state returned by the useCanvas hook
 */
export interface CanvasState {
  // React Flow state
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  // Selection state
  selectedNodes: string[];
  selectedEdges: string[];
  selectNode: (nodeId: string, addToSelection?: boolean) => void;
  selectEdge: (edgeId: string, addToSelection?: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // Node operations
  addNode: (node: Partial<Node> & { type: string; position: XYPosition }) => string;
  updateNode: (nodeId: string, data: Partial<Node['data']>) => void;
  updateNodePosition: (nodeId: string, position: XYPosition) => void;
  removeNode: (nodeId: string) => void;
  removeSelectedNodes: () => void;
  duplicateNode: (nodeId: string) => string | null;

  // Edge operations
  addEdge: (source: string, target: string, sourceHandle?: string, targetHandle?: string) => string;
  removeEdge: (edgeId: string) => void;
  removeSelectedEdges: () => void;

  // Undo/Redo
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  saveHistory: () => void;

  // Viewport controls
  viewport: Viewport;
  setViewport: (viewport: Viewport) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitView: () => void;
  resetView: () => void;

  // React Flow instance
  reactFlowInstance: ReactFlowInstance | null;
  setReactFlowInstance: (instance: ReactFlowInstance) => void;

  // Dirty state
  isDirty: boolean;
  markClean: () => void;

  // Import/Export
  toWorkflowFormat: () => { nodes: WorkflowNode[]; edges: WorkflowEdge[] };
  fromWorkflowFormat: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void;
}

/**
 * Hook options
 */
export interface UseCanvasOptions {
  /** Initial nodes */
  initialNodes?: Node[];
  /** Initial edges */
  initialEdges?: Edge[];
  /** Maximum history length */
  maxHistoryLength?: number;
  /** Callback when canvas changes */
  onChange?: (nodes: Node[], edges: Edge[]) => void;
  /** Default viewport */
  defaultViewport?: Viewport;
}

/**
 * Convert React Flow nodes to workflow format
 */
function toWorkflowNodes(nodes: Node[]): WorkflowNode[] {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type as WorkflowNode['type'],
    position: { x: node.position.x, y: node.position.y },
    data: {
      label: node.data?.label ?? node.type ?? 'Untitled',
      description: node.data?.description,
      icon: node.data?.icon,
      config: node.data?.config ?? {},
    },
  }));
}

/**
 * Convert React Flow edges to workflow format
 */
function toWorkflowEdges(edges: Edge[]): WorkflowEdge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? undefined,
    targetHandle: edge.targetHandle ?? undefined,
    label: typeof edge.label === 'string' ? edge.label : undefined,
    animated: edge.animated,
  }));
}

/**
 * Convert workflow nodes to React Flow format
 */
function fromWorkflowNodes(nodes: WorkflowNode[]): Node[] {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: { x: node.position.x, y: node.position.y },
    data: {
      label: node.data.label,
      description: node.data.description,
      icon: node.data.icon,
      config: node.data.config,
    },
  }));
}

/**
 * Convert workflow edges to React Flow format
 */
function fromWorkflowEdges(edges: WorkflowEdge[]): Edge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    label: edge.label,
    animated: edge.animated,
  }));
}

/**
 * Custom hook for managing React Flow canvas state
 *
 * Provides node/edge management, undo/redo, selection handling,
 * and viewport controls.
 */
export function useCanvas(options: UseCanvasOptions = {}): CanvasState {
  const {
    initialNodes = [],
    initialEdges = [],
    maxHistoryLength = 50,
    onChange,
    defaultViewport = { x: 0, y: 0, zoom: 1 },
  } = options;

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Selection state
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<string[]>([]);

  // History state for undo/redo
  const [history, setHistory] = useState<HistoryEntry[]>([
    { nodes: initialNodes, edges: initialEdges, timestamp: Date.now() },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUndoRedoRef = useRef(false);

  // Viewport state
  const [viewport, setViewport] = useState<Viewport>(defaultViewport);

  // React Flow instance
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // Dirty state tracking
  const [isDirty, setIsDirty] = useState(false);
  const initialStateRef = useRef({ nodes: initialNodes, edges: initialEdges });

  // Track changes and notify
  useEffect(() => {
    if (!isUndoRedoRef.current) {
      onChange?.(nodes, edges);
      setIsDirty(true);
    }
  }, [nodes, edges, onChange]);

  // Save current state to history
  const saveHistory = useCallback(() => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }

    setHistory((prev) => {
      // Remove any future history if we're not at the end
      const newHistory = prev.slice(0, historyIndex + 1);

      // Add new entry
      newHistory.push({
        nodes: [...nodes],
        edges: [...edges],
        timestamp: Date.now(),
      });

      // Limit history length
      if (newHistory.length > maxHistoryLength) {
        newHistory.shift();
        setHistoryIndex((i) => Math.max(0, i - 1));
      }

      return newHistory;
    });

    setHistoryIndex((i) => i + 1);
  }, [nodes, edges, historyIndex, maxHistoryLength]);

  // Undo
  const canUndo = historyIndex > 0;
  const undo = useCallback(() => {
    if (!canUndo) return;

    isUndoRedoRef.current = true;
    const newIndex = historyIndex - 1;
    const entry = history[newIndex];

    setNodes(entry.nodes);
    setEdges(entry.edges);
    setHistoryIndex(newIndex);
  }, [canUndo, history, historyIndex, setNodes, setEdges]);

  // Redo
  const canRedo = historyIndex < history.length - 1;
  const redo = useCallback(() => {
    if (!canRedo) return;

    isUndoRedoRef.current = true;
    const newIndex = historyIndex + 1;
    const entry = history[newIndex];

    setNodes(entry.nodes);
    setEdges(entry.edges);
    setHistoryIndex(newIndex);
  }, [canRedo, history, historyIndex, setNodes, setEdges]);

  // Connection handler
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        rfAddEdge(
          {
            ...connection,
            id: generateId('edge'),
          },
          eds
        )
      );
      saveHistory();
    },
    [setEdges, saveHistory]
  );

  // Selection handlers
  const selectNode = useCallback(
    (nodeId: string, addToSelection = false) => {
      setSelectedNodes((prev) => {
        if (addToSelection) {
          return prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId];
        }
        return [nodeId];
      });

      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          selected: addToSelection
            ? node.id === nodeId
              ? !node.selected
              : node.selected
            : node.id === nodeId,
        }))
      );
    },
    [setNodes]
  );

  const selectEdge = useCallback(
    (edgeId: string, addToSelection = false) => {
      setSelectedEdges((prev) => {
        if (addToSelection) {
          return prev.includes(edgeId) ? prev.filter((id) => id !== edgeId) : [...prev, edgeId];
        }
        return [edgeId];
      });

      setEdges((eds) =>
        eds.map((edge) => ({
          ...edge,
          selected: addToSelection
            ? edge.id === edgeId
              ? !edge.selected
              : edge.selected
            : edge.id === edgeId,
        }))
      );
    },
    [setEdges]
  );

  const selectAll = useCallback(() => {
    setSelectedNodes(nodes.map((n) => n.id));
    setSelectedEdges(edges.map((e) => e.id));
    setNodes((nds) => nds.map((node) => ({ ...node, selected: true })));
    setEdges((eds) => eds.map((edge) => ({ ...edge, selected: true })));
  }, [nodes, edges, setNodes, setEdges]);

  const clearSelection = useCallback(() => {
    setSelectedNodes([]);
    setSelectedEdges([]);
    setNodes((nds) => nds.map((node) => ({ ...node, selected: false })));
    setEdges((eds) => eds.map((edge) => ({ ...edge, selected: false })));
  }, [setNodes, setEdges]);

  // Node operations
  const addNode = useCallback(
    (nodeData: Partial<Node> & { type: string; position: XYPosition }): string => {
      const id = nodeData.id ?? generateId('node');
      const node: Node = {
        id,
        type: nodeData.type,
        position: nodeData.position,
        data: nodeData.data ?? { label: nodeData.type, config: {} },
        ...nodeData,
      };

      setNodes((nds) => [...nds, node]);
      saveHistory();
      return id;
    },
    [setNodes, saveHistory]
  );

  const updateNode = useCallback(
    (nodeId: string, data: Partial<Node['data']>) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
        )
      );
      saveHistory();
    },
    [setNodes, saveHistory]
  );

  const updateNodePosition = useCallback(
    (nodeId: string, position: XYPosition) => {
      setNodes((nds) =>
        nds.map((node) => (node.id === nodeId ? { ...node, position } : node))
      );
    },
    [setNodes]
  );

  const removeNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) =>
        eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
      );
      setSelectedNodes((prev) => prev.filter((id) => id !== nodeId));
      saveHistory();
    },
    [setNodes, setEdges, saveHistory]
  );

  const removeSelectedNodes = useCallback(() => {
    if (selectedNodes.length === 0) return;

    setNodes((nds) => nds.filter((node) => !selectedNodes.includes(node.id)));
    setEdges((eds) =>
      eds.filter(
        (edge) => !selectedNodes.includes(edge.source) && !selectedNodes.includes(edge.target)
      )
    );
    setSelectedNodes([]);
    saveHistory();
  }, [selectedNodes, setNodes, setEdges, saveHistory]);

  const duplicateNode = useCallback(
    (nodeId: string): string | null => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return null;

      const newId = generateId('node');
      const newNode: Node = {
        ...node,
        id: newId,
        position: {
          x: node.position.x + 50,
          y: node.position.y + 50,
        },
        selected: false,
      };

      setNodes((nds) => [...nds, newNode]);
      saveHistory();
      return newId;
    },
    [nodes, setNodes, saveHistory]
  );

  // Edge operations
  const addEdge = useCallback(
    (
      source: string,
      target: string,
      sourceHandle?: string,
      targetHandle?: string
    ): string => {
      const id = generateId('edge');
      const edge: Edge = {
        id,
        source,
        target,
        sourceHandle,
        targetHandle,
      };

      setEdges((eds) => [...eds, edge]);
      saveHistory();
      return id;
    },
    [setEdges, saveHistory]
  );

  const removeEdge = useCallback(
    (edgeId: string) => {
      setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
      setSelectedEdges((prev) => prev.filter((id) => id !== edgeId));
      saveHistory();
    },
    [setEdges, saveHistory]
  );

  const removeSelectedEdges = useCallback(() => {
    if (selectedEdges.length === 0) return;

    setEdges((eds) => eds.filter((edge) => !selectedEdges.includes(edge.id)));
    setSelectedEdges([]);
    saveHistory();
  }, [selectedEdges, setEdges, saveHistory]);

  // Viewport controls
  const zoomIn = useCallback(() => {
    reactFlowInstance?.zoomIn();
  }, [reactFlowInstance]);

  const zoomOut = useCallback(() => {
    reactFlowInstance?.zoomOut();
  }, [reactFlowInstance]);

  const fitView = useCallback(() => {
    reactFlowInstance?.fitView({ padding: 0.2 });
  }, [reactFlowInstance]);

  const resetView = useCallback(() => {
    reactFlowInstance?.setViewport(defaultViewport);
  }, [reactFlowInstance, defaultViewport]);

  // Dirty state
  const markClean = useCallback(() => {
    setIsDirty(false);
    initialStateRef.current = { nodes, edges };
  }, [nodes, edges]);

  // Import/Export
  const toWorkflowFormat = useCallback(
    () => ({
      nodes: toWorkflowNodes(nodes),
      edges: toWorkflowEdges(edges),
    }),
    [nodes, edges]
  );

  const fromWorkflowFormat = useCallback(
    (workflowNodes: WorkflowNode[], workflowEdges: WorkflowEdge[]) => {
      const rfNodes = fromWorkflowNodes(workflowNodes);
      const rfEdges = fromWorkflowEdges(workflowEdges);

      setNodes(rfNodes);
      setEdges(rfEdges);
      setHistory([{ nodes: rfNodes, edges: rfEdges, timestamp: Date.now() }]);
      setHistoryIndex(0);
      setIsDirty(false);
    },
    [setNodes, setEdges]
  );

  return {
    // React Flow state
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,

    // Selection state
    selectedNodes,
    selectedEdges,
    selectNode,
    selectEdge,
    selectAll,
    clearSelection,

    // Node operations
    addNode,
    updateNode,
    updateNodePosition,
    removeNode,
    removeSelectedNodes,
    duplicateNode,

    // Edge operations
    addEdge,
    removeEdge,
    removeSelectedEdges,

    // Undo/Redo
    canUndo,
    canRedo,
    undo,
    redo,
    saveHistory,

    // Viewport controls
    viewport,
    setViewport,
    zoomIn,
    zoomOut,
    fitView,
    resetView,

    // React Flow instance
    reactFlowInstance,
    setReactFlowInstance,

    // Dirty state
    isDirty,
    markClean,

    // Import/Export
    toWorkflowFormat,
    fromWorkflowFormat,
  };
}
