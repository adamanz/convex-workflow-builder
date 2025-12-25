import { motion, AnimatePresence } from 'framer-motion';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  SkipForward,
  Zap,
  GitBranch,
  Timer,
  Layers,
  RotateCw,
  Bot,
  Database,
  Search,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, memo } from 'react';
import { cn, formatDuration, truncate, safeStringify } from '../../lib/utils';
import type {
  WorkflowNode,
  WorkflowEdge,
  StepResult,
  StepStatus,
  NodeType,
} from '../../types/workflow';

interface LiveCanvasProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  stepResults: StepResult[];
  currentStepId?: string;
  className?: string;
}

/**
 * Node type icons
 */
const nodeTypeIcons: Record<NodeType, typeof Play> = {
  start: Play,
  end: CheckCircle2,
  action: Zap,
  mutation: Database,
  query: Search,
  condition: GitBranch,
  delay: Timer,
  parallel: Layers,
  loop: RotateCw,
  ai: Bot,
};

/**
 * Step status configuration
 */
const stepStatusConfig: Record<
  StepStatus,
  {
    borderColor: string;
    bgColor: string;
    glowColor: string;
    textColor: string;
  }
> = {
  pending: {
    borderColor: 'border-zinc-600',
    bgColor: 'bg-zinc-900',
    glowColor: 'rgba(82, 82, 91, 0.3)',
    textColor: 'text-zinc-400',
  },
  running: {
    borderColor: 'border-blue-500',
    bgColor: 'bg-blue-950/50',
    glowColor: 'rgba(59, 130, 246, 0.5)',
    textColor: 'text-blue-300',
  },
  completed: {
    borderColor: 'border-emerald-500',
    bgColor: 'bg-emerald-950/50',
    glowColor: 'rgba(16, 185, 129, 0.3)',
    textColor: 'text-emerald-300',
  },
  failed: {
    borderColor: 'border-red-500',
    bgColor: 'bg-red-950/50',
    glowColor: 'rgba(239, 68, 68, 0.5)',
    textColor: 'text-red-300',
  },
  skipped: {
    borderColor: 'border-amber-500',
    bgColor: 'bg-amber-950/50',
    glowColor: 'rgba(245, 158, 11, 0.3)',
    textColor: 'text-amber-300',
  },
};

/**
 * Status icon component
 */
function StatusIndicator({ status }: { status: StepStatus }) {
  switch (status) {
    case 'running':
      return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="w-3.5 h-3.5 text-blue-400" />
        </motion.div>
      );
    case 'completed':
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
    case 'failed':
      return <XCircle className="w-3.5 h-3.5 text-red-400" />;
    case 'skipped':
      return <SkipForward className="w-3.5 h-3.5 text-amber-400" />;
    default:
      return <Clock className="w-3.5 h-3.5 text-zinc-500" />;
  }
}

/**
 * Custom node component with execution state
 */
const ExecutionNode = memo(function ExecutionNode({
  data,
}: NodeProps<{
  label: string;
  description?: string;
  nodeType: NodeType;
  status: StepStatus;
  stepResult?: StepResult;
  isCurrentStep: boolean;
}>) {
  const config = stepStatusConfig[data.status];
  const NodeIcon = nodeTypeIcons[data.nodeType] || Zap;

  return (
    <motion.div
      className={cn(
        'relative px-4 py-3 rounded-xl border-2 min-w-[160px] max-w-[220px]',
        config.borderColor,
        config.bgColor
      )}
      style={{
        boxShadow: data.isCurrentStep
          ? `0 0 20px ${config.glowColor}, 0 0 40px ${config.glowColor}`
          : `0 0 10px ${config.glowColor}`,
      }}
      animate={
        data.isCurrentStep
          ? {
              scale: [1, 1.02, 1],
              boxShadow: [
                `0 0 20px ${config.glowColor}`,
                `0 0 30px ${config.glowColor}`,
                `0 0 20px ${config.glowColor}`,
              ],
            }
          : {}
      }
      transition={
        data.isCurrentStep
          ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
          : {}
      }
    >
      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-500"
      />

      {/* Pulse effect for running nodes */}
      <AnimatePresence>
        {data.status === 'running' && (
          <motion.div
            className="absolute inset-0 rounded-xl border-2 border-blue-400"
            initial={{ opacity: 0.8, scale: 1 }}
            animate={{
              opacity: [0.8, 0],
              scale: [1, 1.15],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        )}
      </AnimatePresence>

      {/* Node content */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0',
            data.status === 'running' && 'bg-blue-900/50',
            data.status === 'completed' && 'bg-emerald-900/50',
            data.status === 'failed' && 'bg-red-900/50',
            data.status === 'skipped' && 'bg-amber-900/50',
            data.status === 'pending' && 'bg-zinc-800'
          )}
        >
          <NodeIcon className={cn('w-4 h-4', config.textColor)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className={cn(
                'text-sm font-medium truncate',
                config.textColor
              )}
            >
              {data.label}
            </h3>
            <StatusIndicator status={data.status} />
          </div>

          {data.description && (
            <p className="text-xs text-zinc-500 truncate mt-0.5">
              {data.description}
            </p>
          )}

          {/* Step result preview */}
          {data.stepResult?.duration && (
            <p className="text-[10px] text-zinc-500 mt-1 font-mono">
              {formatDuration(data.stepResult.duration)}
            </p>
          )}
        </div>
      </div>

      {/* Output preview tooltip */}
      <AnimatePresence>
        {data.stepResult?.output && data.status === 'completed' && (
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-10 max-w-xs"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
          >
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-2 shadow-xl">
              <p className="text-[10px] text-zinc-500 mb-1">Output</p>
              <pre className="text-[10px] text-emerald-400 font-mono max-h-16 overflow-hidden">
                {truncate(safeStringify(data.stepResult.output, 0), 100)}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error preview for failed nodes */}
      <AnimatePresence>
        {data.stepResult?.error && data.status === 'failed' && (
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-10 max-w-xs"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
          >
            <div className="bg-red-950/80 border border-red-800 rounded-lg p-2 shadow-xl">
              <p className="text-[10px] text-red-500 mb-1">Error</p>
              <p className="text-[10px] text-red-300 max-h-16 overflow-hidden">
                {truncate(data.stepResult.error, 100)}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

/**
 * Custom animated edge component
 */
function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  markerEnd,
  data,
}: {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  style?: React.CSSProperties;
  markerEnd?: string;
  data?: { isActive?: boolean; isCompleted?: boolean };
}) {
  const isActive = data?.isActive || false;
  const isCompleted = data?.isCompleted || false;

  // Calculate edge path
  const midY = (sourceY + targetY) / 2;
  const edgePath = `M ${sourceX} ${sourceY} C ${sourceX} ${midY}, ${targetX} ${midY}, ${targetX} ${targetY}`;

  return (
    <>
      {/* Base edge */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        style={{
          ...style,
          stroke: isCompleted
            ? '#10b981'
            : isActive
              ? '#3b82f6'
              : '#52525b',
          strokeWidth: isActive ? 3 : 2,
        }}
        markerEnd={markerEnd}
      />

      {/* Animated flow indicator */}
      {isActive && (
        <motion.circle
          r="4"
          fill="#3b82f6"
          filter="url(#glow)"
        >
          <animateMotion
            dur="1s"
            repeatCount="indefinite"
            path={edgePath}
          />
        </motion.circle>
      )}

      {/* Completed edge glow */}
      {isCompleted && (
        <path
          d={edgePath}
          style={{
            stroke: '#10b981',
            strokeWidth: 6,
            opacity: 0.3,
            filter: 'blur(4px)',
          }}
        />
      )}
    </>
  );
}

// Node types for React Flow
const nodeTypes = {
  executionNode: ExecutionNode,
};

// Edge types for React Flow
const edgeTypes = {
  animated: AnimatedEdge,
};

/**
 * Live canvas overlay for workflow execution
 *
 * Features:
 * - Highlights the currently executing node
 * - Shows animated data flow on edges
 * - Pulses the active node
 * - Shows step result previews on nodes
 */
export function LiveCanvas({
  nodes: workflowNodes,
  edges: workflowEdges,
  stepResults,
  currentStepId,
  className,
}: LiveCanvasProps) {
  // Create step result lookup
  const stepResultMap = useMemo(() => {
    const map = new Map<string, StepResult>();
    stepResults.forEach((result) => {
      map.set(result.nodeId, result);
    });
    return map;
  }, [stepResults]);

  // Transform workflow nodes to React Flow nodes
  const initialNodes = useMemo((): Node[] => {
    return workflowNodes.map((node) => {
      const stepResult = stepResultMap.get(node.id);
      const status: StepStatus = stepResult?.status || 'pending';

      return {
        id: node.id,
        type: 'executionNode',
        position: node.position,
        data: {
          label: node.data.label,
          description: node.data.description,
          nodeType: node.type,
          status,
          stepResult,
          isCurrentStep: node.id === currentStepId,
        },
      };
    });
  }, [workflowNodes, stepResultMap, currentStepId]);

  // Transform workflow edges to React Flow edges
  const initialEdges = useMemo((): Edge[] => {
    return workflowEdges.map((edge) => {
      const sourceResult = stepResultMap.get(edge.source);
      const targetResult = stepResultMap.get(edge.target);

      const isCompleted = sourceResult?.status === 'completed';
      const isActive =
        sourceResult?.status === 'completed' &&
        targetResult?.status === 'running';

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        type: 'animated',
        animated: isActive,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isCompleted ? '#10b981' : isActive ? '#3b82f6' : '#52525b',
        },
        data: {
          isActive,
          isCompleted,
        },
        style: {
          strokeWidth: isActive ? 3 : 2,
        },
      };
    });
  }, [workflowEdges, stepResultMap]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when step results change
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  // Update edges when step results change
  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  return (
    <div className={cn('w-full h-full bg-zinc-950', className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        className="bg-zinc-950"
      >
        {/* SVG filter for glow effect */}
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </svg>

        <Background
          color="#27272a"
          gap={20}
          size={1}
          className="bg-zinc-950"
        />
        <Controls
          className="!bg-zinc-900 !border-zinc-700 !rounded-lg [&>button]:!bg-zinc-800 [&>button]:!border-zinc-700 [&>button]:!text-zinc-400 [&>button:hover]:!bg-zinc-700"
        />
        <MiniMap
          className="!bg-zinc-900 !border-zinc-700 !rounded-lg"
          nodeColor={(node) => {
            const status = node.data?.status as StepStatus;
            switch (status) {
              case 'completed':
                return '#10b981';
              case 'running':
                return '#3b82f6';
              case 'failed':
                return '#ef4444';
              default:
                return '#52525b';
            }
          }}
          maskColor="rgba(0, 0, 0, 0.8)"
        />
      </ReactFlow>
    </div>
  );
}

export default LiveCanvas;
