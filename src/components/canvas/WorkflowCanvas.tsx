import { useCallback, useRef, useMemo, type DragEvent } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  SelectionMode,
  type Connection,
  type Node,
  type Edge,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Node Components
import { StartNode } from './nodes/StartNode';
import { EndNode } from './nodes/EndNode';
import { ActionNode } from './nodes/ActionNode';
import { ConditionNode } from './nodes/ConditionNode';
import { DelayNode } from './nodes/DelayNode';

// Edge Components
import { CustomEdge } from './CustomEdge';

// Types
import type { StepTemplate, WorkflowNode, WorkflowEdge } from '@/types/workflow';

// Define node types - use explicit typing to satisfy React Flow
const nodeTypes = {
  start: StartNode,
  end: EndNode,
  action: ActionNode,
  condition: ConditionNode,
  delay: DelayNode,
  // Additional types can be added here - reuse action node styling
  mutation: ActionNode,
  query: ActionNode,
  parallel: ActionNode,
  loop: ActionNode,
  ai: ActionNode,
} as const;

// Define edge types
const edgeTypes = {
  custom: CustomEdge,
} as const;

// Default edge options
const defaultEdgeOptions = {
  type: 'custom',
  animated: false,
};

export interface WorkflowCanvasProps {
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  onNodesChange?: OnNodesChange;
  onEdgesChange?: OnEdgesChange;
  onConnect?: OnConnect;
  onNodeSelect?: (nodeId: string | null) => void;
  onEdgeSelect?: (edgeId: string | null) => void;
  onDrop?: (template: StepTemplate, position: { x: number; y: number }) => void;
  readOnly?: boolean;
  className?: string;
}

function WorkflowCanvasInner({
  nodes: initialNodes = [],
  edges: initialEdges = [],
  onNodesChange: externalOnNodesChange,
  onEdgesChange: externalOnEdgesChange,
  onConnect: externalOnConnect,
  onNodeSelect,
  onEdgeSelect,
  onDrop,
  readOnly = false,
  className,
}: WorkflowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  // Convert WorkflowNode/Edge to ReactFlow Node/Edge format
  const convertedNodes: Node[] = useMemo(
    () =>
      initialNodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: {
          label: node.data.label,
          description: node.data.description,
          ...node.data.config,
        },
      })),
    [initialNodes]
  );

  const convertedEdges: Edge[] = useMemo(
    () =>
      initialEdges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle ?? null,
        targetHandle: edge.targetHandle ?? null,
        type: 'custom',
        data: {
          label: edge.label,
          animated: edge.animated,
        },
      })),
    [initialEdges]
  );

  const [nodes, , onNodesChange] = useNodesState(convertedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(convertedEdges);

  // Handle node changes
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      externalOnNodesChange?.(changes);
    },
    [onNodesChange, externalOnNodesChange]
  );

  // Handle edge changes
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
      externalOnEdgesChange?.(changes);
    },
    [onEdgesChange, externalOnEdgesChange]
  );

  // Handle new connections
  const handleConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (readOnly) return;

      const newEdge: Edge = {
        id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
        source: connection.source ?? '',
        target: connection.target ?? '',
        sourceHandle: connection.sourceHandle ?? null,
        targetHandle: connection.targetHandle ?? null,
        type: 'custom',
        data: { animated: false },
      };
      setEdges((eds) => addEdge(newEdge, eds));
      externalOnConnect?.(connection);
    },
    [setEdges, externalOnConnect, readOnly]
  );

  // Handle selection changes
  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }: { nodes: Node[]; edges: Edge[] }) => {
      if (selectedNodes.length === 1) {
        onNodeSelect?.(selectedNodes[0].id);
      } else if (selectedNodes.length === 0) {
        onNodeSelect?.(null);
      }

      if (selectedEdges.length === 1) {
        onEdgeSelect?.(selectedEdges[0].id);
      } else if (selectedEdges.length === 0) {
        onEdgeSelect?.(null);
      }
    },
    [onNodeSelect, onEdgeSelect]
  );

  // Handle drag over for node dropping
  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop for new nodes
  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      if (readOnly) return;

      const templateData = event.dataTransfer.getData('application/reactflow');
      if (!templateData) return;

      try {
        const template: StepTemplate = JSON.parse(templateData);

        // Get position in flow coordinates
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        onDrop?.(template, position);
      } catch (error) {
        console.error('Failed to parse dropped template:', error);
      }
    },
    [screenToFlowPosition, onDrop, readOnly]
  );

  // MiniMap node color
  const miniMapNodeColor = useCallback((node: Node) => {
    switch (node.type) {
      case 'start':
        return '#10b981'; // emerald-500
      case 'end':
        return '#ef4444'; // red-500
      case 'condition':
        return '#eab308'; // yellow-500
      case 'delay':
        return '#a855f7'; // purple-500
      default:
        return '#3b82f6'; // blue-500
    }
  }, []);

  return (
    <div
      ref={reactFlowWrapper}
      className={cn('w-full h-full', className)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onSelectionChange={handleSelectionChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        selectionMode={SelectionMode.Partial}
        selectionOnDrag={!readOnly}
        panOnDrag={[1, 2]} // Middle mouse or right mouse
        selectNodesOnDrag={false}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
        className="workflow-canvas"
        proOptions={{ hideAttribution: true }}
      >
        {/* Grid Background */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#27272a"
          className="!bg-zinc-950"
        />

        {/* Controls */}
        <Controls
          showInteractive={false}
          className={cn(
            '!bg-zinc-900 !border-zinc-800 !rounded-lg !shadow-lg',
            '[&>button]:!bg-transparent [&>button]:!border-zinc-800',
            '[&>button]:!fill-zinc-400 [&>button:hover]:!fill-white',
            '[&>button:hover]:!bg-zinc-800'
          )}
        />

        {/* MiniMap */}
        <MiniMap
          nodeColor={miniMapNodeColor}
          maskColor="rgba(0, 0, 0, 0.8)"
          className={cn(
            '!bg-zinc-900 !border-zinc-800 !rounded-lg !shadow-lg'
          )}
          pannable
          zoomable
        />

        {/* Optional Panel for actions */}
        <Panel position="top-right" className="space-y-2">
          <AnimatePresence>
            {readOnly && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  'px-3 py-1.5 rounded-md',
                  'bg-zinc-800/80 backdrop-blur-sm',
                  'border border-zinc-700',
                  'text-xs text-zinc-400'
                )}
              >
                Read Only
              </motion.div>
            )}
          </AnimatePresence>
        </Panel>
      </ReactFlow>
    </div>
  );
}

// Wrapper component with ReactFlowProvider
export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
