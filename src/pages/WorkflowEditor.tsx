/**
 * Workflow Editor Page
 *
 * Full-screen workflow editor with canvas, node palette,
 * properties panel, and execution controls.
 */
import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import { useQuery, useMutation } from 'convex/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  Handle,
  Position,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Save,
  Play,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Settings,
  Loader2,
  Check,
  AlertCircle,
  PanelLeftClose,
  PanelRightClose,
  Keyboard,
  Zap,
  GitBranch,
  Timer,
  Layers,
  RotateCw,
  Bot,
  Database,
  Search,
  CircleDot,
  Square,
  Globe,
  ArrowRightLeft,
  X,
  MoreHorizontal,
} from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import type { NodeType, WorkflowNode, WorkflowEdge } from '../types/workflow';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { ExecutionPanel } from '../components/execution/ExecutionPanel';

interface WorkflowEditorProps {
  workflowId: string;
  onBack?: () => void;
}

// Node type configuration
const nodeTypeConfig: Record<
  NodeType,
  {
    label: string;
    icon: typeof Zap;
    color: string;
    bgColor: string;
    borderColor: string;
    category: string;
  }
> = {
  start: {
    label: 'Start',
    icon: CircleDot,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-950/50',
    borderColor: 'border-emerald-600',
    category: 'core',
  },
  end: {
    label: 'End',
    icon: Square,
    color: 'text-red-400',
    bgColor: 'bg-red-950/50',
    borderColor: 'border-red-600',
    category: 'core',
  },
  action: {
    label: 'Action',
    icon: Zap,
    color: 'text-blue-400',
    bgColor: 'bg-blue-950/50',
    borderColor: 'border-blue-600',
    category: 'core',
  },
  http: {
    label: 'HTTP Request',
    icon: Globe,
    color: 'text-purple-400',
    bgColor: 'bg-purple-950/50',
    borderColor: 'border-purple-600',
    category: 'integration',
  },
  transform: {
    label: 'Transform',
    icon: ArrowRightLeft,
    color: 'text-orange-400',
    bgColor: 'bg-orange-950/50',
    borderColor: 'border-orange-600',
    category: 'data',
  },
  mutation: {
    label: 'Mutation',
    icon: Database,
    color: 'text-pink-400',
    bgColor: 'bg-pink-950/50',
    borderColor: 'border-pink-600',
    category: 'data',
  },
  query: {
    label: 'Query',
    icon: Search,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-950/50',
    borderColor: 'border-cyan-600',
    category: 'data',
  },
  condition: {
    label: 'Condition',
    icon: GitBranch,
    color: 'text-amber-400',
    bgColor: 'bg-amber-950/50',
    borderColor: 'border-amber-600',
    category: 'logic',
  },
  delay: {
    label: 'Delay',
    icon: Timer,
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-800/50',
    borderColor: 'border-zinc-600',
    category: 'logic',
  },
  parallel: {
    label: 'Parallel',
    icon: Layers,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-950/50',
    borderColor: 'border-indigo-600',
    category: 'logic',
  },
  loop: {
    label: 'Loop',
    icon: RotateCw,
    color: 'text-teal-400',
    bgColor: 'bg-teal-950/50',
    borderColor: 'border-teal-600',
    category: 'logic',
  },
  ai: {
    label: 'AI',
    icon: Bot,
    color: 'text-violet-400',
    bgColor: 'bg-violet-950/50',
    borderColor: 'border-violet-600',
    category: 'ai',
  },
};

// Categories for the palette
const categories = [
  { id: 'core', label: 'Core', types: ['start', 'end', 'action'] },
  { id: 'data', label: 'Data', types: ['mutation', 'query', 'transform'] },
  { id: 'logic', label: 'Logic', types: ['condition', 'delay', 'parallel', 'loop'] },
  { id: 'integration', label: 'Integration', types: ['http'] },
  { id: 'ai', label: 'AI', types: ['ai'] },
];

/**
 * Custom node component
 */
function WorkflowNodeComponent({ data, selected }: NodeProps) {
  const config = nodeTypeConfig[data.nodeType as NodeType] || nodeTypeConfig.action;
  const Icon = config.icon;

  return (
    <motion.div
      className={cn(
        'relative px-4 py-3 rounded-xl border-2 min-w-[140px] max-w-[200px]',
        config.borderColor,
        config.bgColor,
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-zinc-950'
      )}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.1 }}
    >
      {/* Input handle */}
      {data.nodeType !== 'start' && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-500 hover:!bg-primary hover:!border-primary transition-colors"
        />
      )}

      {/* Output handle */}
      {data.nodeType !== 'end' && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-500 hover:!bg-primary hover:!border-primary transition-colors"
        />
      )}

      {/* Condition node has two outputs */}
      {data.nodeType === 'condition' && (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            style={{ left: '30%' }}
            className="!w-3 !h-3 !bg-emerald-600 !border-2 !border-emerald-500"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            style={{ left: '70%' }}
            className="!w-3 !h-3 !bg-red-600 !border-2 !border-red-500"
          />
        </>
      )}

      <div className="flex items-center gap-2">
        <div className={cn('p-1.5 rounded-lg', config.bgColor)}>
          <Icon className={cn('w-4 h-4', config.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-200 truncate">
            {data.label}
          </p>
          <p className="text-[10px] text-zinc-500 capitalize">{data.nodeType}</p>
        </div>
      </div>
    </motion.div>
  );
}

const nodeTypes = {
  workflowNode: WorkflowNodeComponent,
};

/**
 * Node palette component (left sidebar)
 */
function NodePalette({
  isOpen,
  onClose,
  onDragStart,
}: {
  isOpen: boolean;
  onClose: () => void;
  onDragStart: (event: React.DragEvent, nodeType: NodeType) => void;
}) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['core', 'data', 'logic'])
  );

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col h-full"
          initial={{ x: -256, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -256, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-200">Node Palette</h2>
            <button
              className="p-1 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800 transition-colors"
              onClick={onClose}
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {categories.map((category) => (
              <div key={category.id}>
                <button
                  className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 rounded transition-colors"
                  onClick={() => toggleCategory(category.id)}
                >
                  <span className="uppercase tracking-wider">{category.label}</span>
                  <ChevronRight
                    className={cn(
                      'w-3.5 h-3.5 transition-transform',
                      expandedCategories.has(category.id) && 'rotate-90'
                    )}
                  />
                </button>

                <AnimatePresence>
                  {expandedCategories.has(category.id) && (
                    <motion.div
                      className="mt-1 space-y-1"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      {category.types.map((type) => {
                        const config = nodeTypeConfig[type as NodeType];
                        if (!config) return null;
                        const Icon = config.icon;

                        return (
                          <motion.div
                            key={type}
                            className={cn(
                              'flex items-center gap-2 px-3 py-2 rounded-lg cursor-grab',
                              'bg-zinc-900/50 border border-zinc-800',
                              'hover:bg-zinc-800 hover:border-zinc-700',
                              'transition-colors'
                            )}
                            draggable
                            onDragStart={(e) => onDragStart(e, type as NodeType)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className={cn('p-1.5 rounded-md', config.bgColor)}>
                              <Icon className={cn('w-3.5 h-3.5', config.color)} />
                            </div>
                            <span className="text-sm text-zinc-300">{config.label}</span>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-zinc-800">
            <p className="text-[10px] text-zinc-500 text-center">
              Drag nodes to canvas to add them
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Properties panel component (right sidebar)
 */
function PropertiesPanel({
  isOpen,
  onClose,
  selectedNode,
  onUpdateNode,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedNode: Node | null;
  onUpdateNode: (nodeId: string, data: Record<string, unknown>) => void;
}) {
  const [localLabel, setLocalLabel] = useState('');

  useEffect(() => {
    if (selectedNode) {
      setLocalLabel(selectedNode.data.label as string || '');
    }
  }, [selectedNode]);

  const handleLabelChange = (label: string) => {
    setLocalLabel(label);
    if (selectedNode) {
      onUpdateNode(selectedNode.id, { label });
    }
  };

  const config = selectedNode
    ? nodeTypeConfig[selectedNode.data.nodeType as NodeType]
    : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="w-80 bg-zinc-950 border-l border-zinc-800 flex flex-col h-full"
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-200">Properties</h2>
            <button
              className="p-1 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800 transition-colors"
              onClick={onClose}
            >
              <PanelRightClose className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {selectedNode && config ? (
              <div className="space-y-6">
                {/* Node type header */}
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg', config.bgColor)}>
                    <config.icon className={cn('w-5 h-5', config.color)} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      {config.label} Node
                    </p>
                    <p className="text-xs text-zinc-500">ID: {selectedNode.id}</p>
                  </div>
                </div>

                {/* Label input */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-400">Label</label>
                  <Input
                    value={localLabel}
                    onChange={(e) => handleLabelChange(e.target.value)}
                    className="bg-zinc-900 border-zinc-800"
                    placeholder="Enter node label"
                  />
                </div>

                {/* Position info */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-400">Position</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-zinc-500">X</span>
                      <p className="text-sm text-zinc-300 font-mono">
                        {Math.round(selectedNode.position.x)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500">Y</span>
                      <p className="text-sm text-zinc-300 font-mono">
                        {Math.round(selectedNode.position.y)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Node-specific configuration */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-400">Configuration</label>
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
                    <p className="text-xs text-zinc-500">
                      Node-specific settings will appear here
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                <Settings className="w-8 h-8 mb-3 opacity-50" />
                <p className="text-sm">Select a node to view properties</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Main editor content with React Flow
 */
function EditorContent({ workflowId, onBack }: WorkflowEditorProps) {
  const reactFlowInstance = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // State
  const [isPalletteOpen, setIsPaletteOpen] = useState(true);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(true);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [workflowName, setWorkflowName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isExecutionPanelOpen, setIsExecutionPanelOpen] = useState(false);
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);

  // History for undo/redo
  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Convex queries and mutations
  const workflow = useQuery(api.workflows.getWorkflow, {
    id: workflowId as Id<'workflows'>,
  });
  const updateWorkflow = useMutation(api.workflows.updateWorkflow);
  const executeWorkflow = useMutation(api.executions.executeWorkflow);

  // Convert workflow nodes to React Flow nodes
  const initialNodes = useMemo((): Node[] => {
    if (!workflow?.nodes) return [];
    return workflow.nodes.map((node) => ({
      id: node.id,
      type: 'workflowNode',
      position: node.position,
      data: {
        label: node.data.label,
        nodeType: node.type,
        config: node.data.config,
      },
    }));
  }, [workflow?.nodes]);

  // Convert workflow edges to React Flow edges
  const initialEdges = useMemo((): Edge[] => {
    if (!workflow?.edges) return [];
    return workflow.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: 'smoothstep',
      animated: false,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#52525b',
      },
      style: { stroke: '#52525b', strokeWidth: 2 },
    }));
  }, [workflow?.edges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Initialize nodes and edges when workflow loads
  useEffect(() => {
    if (workflow) {
      setNodes(initialNodes);
      setEdges(initialEdges);
      setWorkflowName(workflow.name);
      setHistory([{ nodes: initialNodes, edges: initialEdges }]);
      setHistoryIndex(0);
    }
  }, [workflow, initialNodes, initialEdges, setNodes, setEdges]);

  // Track changes
  useEffect(() => {
    if (workflow && (nodes.length > 0 || edges.length > 0)) {
      const nodesChanged = JSON.stringify(nodes) !== JSON.stringify(initialNodes);
      const edgesChanged = JSON.stringify(edges) !== JSON.stringify(initialEdges);
      setHasUnsavedChanges(nodesChanged || edgesChanged);
    }
  }, [nodes, edges, workflow, initialNodes, initialEdges]);

  // Save changes
  const handleSave = useCallback(async () => {
    if (!workflow) return;

    setIsSaving(true);
    try {
      const workflowNodes: WorkflowNode[] = nodes.map((node) => ({
        id: node.id,
        type: node.data.nodeType as NodeType,
        position: node.position,
        data: {
          label: node.data.label as string,
          config: node.data.config || {},
        },
      }));

      const workflowEdges: WorkflowEdge[] = edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        label: edge.label as string | undefined,
      }));

      await updateWorkflow({
        id: workflowId as Id<'workflows'>,
        name: workflowName,
        nodes: workflowNodes,
        edges: workflowEdges,
      });

      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save workflow:', error);
    } finally {
      setIsSaving(false);
    }
  }, [workflow, nodes, edges, workflowName, updateWorkflow, workflowId]);

  // Auto-save
  useEffect(() => {
    if (hasUnsavedChanges) {
      const timer = setTimeout(handleSave, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasUnsavedChanges, handleSave]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Cmd/Ctrl + Z to undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Cmd/Ctrl + Shift + Z to redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      }
      // Delete selected nodes
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNode && document.activeElement?.tagName !== 'INPUT') {
          e.preventDefault();
          setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
          setEdges((eds) =>
            eds.filter(
              (e) => e.source !== selectedNode.id && e.target !== selectedNode.id
            )
          );
          setSelectedNode(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, selectedNode, setNodes, setEdges]);

  // Add to history
  const addToHistory = useCallback(() => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ nodes: [...nodes], edges: [...edges] });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex, nodes, edges]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setNodes(history[newIndex].nodes);
      setEdges(history[newIndex].edges);
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setNodes(history[newIndex].nodes);
      setEdges(history[newIndex].edges);
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  // Handle edge connections
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: 'smoothstep',
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#52525b',
            },
            style: { stroke: '#52525b', strokeWidth: 2 },
          },
          eds
        )
      );
      addToHistory();
    },
    [setEdges, addToHistory]
  );

  // Handle node selection
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Handle drag and drop from palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (!type || !reactFlowWrapper.current) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      const config = nodeTypeConfig[type];
      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type: 'workflowNode',
        position,
        data: {
          label: config.label,
          nodeType: type,
          config: {},
        },
      };

      setNodes((nds) => [...nds, newNode]);
      addToHistory();
    },
    [reactFlowInstance, setNodes, addToHistory]
  );

  // Handle node drag
  const onDragStart = useCallback(
    (event: React.DragEvent, nodeType: NodeType) => {
      event.dataTransfer.setData('application/reactflow', nodeType);
      event.dataTransfer.effectAllowed = 'move';
    },
    []
  );

  // Update node data
  const onUpdateNode = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...data } }
            : node
        )
      );
    },
    [setNodes]
  );

  // Run workflow
  const handleRunWorkflow = useCallback(async () => {
    if (!workflow) return;

    try {
      const executionId = await executeWorkflow({
        workflowId: workflowId as Id<'workflows'>,
      });
      setCurrentExecutionId(executionId);
      setIsExecutionPanelOpen(true);
    } catch (error) {
      console.error('Failed to execute workflow:', error);
    }
  }, [workflow, executeWorkflow, workflowId]);

  // Loading state
  if (!workflow) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      {/* Top toolbar */}
      <header className="h-14 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ChevronLeft className="w-5 h-5" />
          </Button>

          {isEditingName ? (
            <Input
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
              className="w-64 h-8 bg-zinc-900 border-zinc-700"
              autoFocus
            />
          ) : (
            <button
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-zinc-900 transition-colors"
              onClick={() => setIsEditingName(true)}
            >
              <h1 className="text-lg font-semibold text-foreground">
                {workflowName}
              </h1>
              <Badge variant={workflow.status === 'published' ? 'success' : 'secondary'}>
                {workflow.status}
              </Badge>
            </button>
          )}

          {/* Save indicator */}
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            {isSaving ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Saving...</span>
              </>
            ) : hasUnsavedChanges ? (
              <>
                <AlertCircle className="w-3 h-3 text-amber-500" />
                <span>Unsaved changes</span>
              </>
            ) : lastSaved ? (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                <span>Saved</span>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <div className="flex items-center border border-zinc-800 rounded-md">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
            >
              <Undo2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
            >
              <Redo2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center border border-zinc-800 rounded-md">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => reactFlowInstance.zoomOut()}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => reactFlowInstance.zoomIn()}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => reactFlowInstance.fitView()}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Keyboard shortcuts */}
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Keyboard className="w-4 h-4" />
          </Button>

          {/* Save button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
          >
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>

          {/* Run button */}
          <Button size="sm" onClick={handleRunWorkflow}>
            <Play className="w-4 h-4 mr-1" />
            Run
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Node palette */}
        <NodePalette
          isOpen={isPalletteOpen}
          onClose={() => setIsPaletteOpen(false)}
          onDragStart={onDragStart}
        />

        {/* Toggle button for palette */}
        {!isPalletteOpen && (
          <button
            className="absolute left-4 top-20 z-10 p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            onClick={() => setIsPaletteOpen(true)}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Canvas */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.1}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            className="bg-zinc-950"
          >
            <Background color="#27272a" gap={20} size={1} />
            <MiniMap
              className="!bg-zinc-900 !border-zinc-700 !rounded-lg"
              nodeColor="#3f3f46"
              maskColor="rgba(0, 0, 0, 0.8)"
            />
            <Controls className="!bg-zinc-900 !border-zinc-700 !rounded-lg [&>button]:!bg-zinc-800 [&>button]:!border-zinc-700 [&>button]:!text-zinc-400 [&>button:hover]:!bg-zinc-700" />

            {/* Execution panel */}
            <Panel position="bottom-center" className="w-[600px]">
              <AnimatePresence>
                {isExecutionPanelOpen && (
                  <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                  >
                    <ExecutionPanel
                      executionId={currentExecutionId}
                      onClose={() => setIsExecutionPanelOpen(false)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </Panel>
          </ReactFlow>
        </div>

        {/* Right sidebar - Properties */}
        <PropertiesPanel
          isOpen={isPropertiesOpen}
          onClose={() => setIsPropertiesOpen(false)}
          selectedNode={selectedNode}
          onUpdateNode={onUpdateNode}
        />

        {/* Toggle button for properties */}
        {!isPropertiesOpen && (
          <button
            className="absolute right-4 top-20 z-10 p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            onClick={() => setIsPropertiesOpen(true)}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Workflow Editor with React Flow provider
 */
export function WorkflowEditor(props: WorkflowEditorProps) {
  return (
    <ReactFlowProvider>
      <EditorContent {...props} />
    </ReactFlowProvider>
  );
}

export default WorkflowEditor;
