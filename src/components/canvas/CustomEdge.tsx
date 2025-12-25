import { memo } from 'react';
import {
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
  type Position,
} from '@xyflow/react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface CustomEdgeData {
  label?: string;
  animated?: boolean;
  status?: 'pending' | 'active' | 'completed' | 'failed';
}

interface CustomEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  data?: CustomEdgeData;
  selected?: boolean;
  markerEnd?: string;
}

const statusColors = {
  pending: {
    stroke: '#52525b', // zinc-600
    gradient: ['#52525b', '#3f3f46'],
  },
  active: {
    stroke: '#3b82f6', // blue-500
    gradient: ['#3b82f6', '#60a5fa'],
  },
  completed: {
    stroke: '#10b981', // emerald-500
    gradient: ['#10b981', '#34d399'],
  },
  failed: {
    stroke: '#ef4444', // red-500
    gradient: ['#ef4444', '#f87171'],
  },
};

function CustomEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: CustomEdgeProps) {
  const status = data?.status || 'pending';
  const isAnimated = data?.animated || status === 'active';
  const colors = statusColors[status];

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      {/* Gradient Definition */}
      <defs>
        <linearGradient id={`edge-gradient-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={colors.gradient[0]} />
          <stop offset="100%" stopColor={colors.gradient[1]} />
        </linearGradient>
      </defs>

      {/* Background path for selection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="react-flow__edge-interaction"
      />

      {/* Glow effect for active/selected edges */}
      {(status === 'active' || selected) && (
        <path
          d={edgePath}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={4}
          strokeOpacity={0.3}
          filter="blur(4px)"
        />
      )}

      {/* Main edge path */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? '#3b82f6' : `url(#edge-gradient-${id})`,
          strokeWidth: selected ? 2.5 : 2,
          transition: 'stroke 0.2s, stroke-width 0.2s',
        }}
      />

      {/* Animated dashes for active edges */}
      {isAnimated && (
        <motion.path
          d={edgePath}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={2}
          strokeDasharray="8 8"
          initial={{ strokeDashoffset: 0 }}
          animate={{ strokeDashoffset: -16 }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      )}

      {/* Edge label */}
      {data?.label && (
        <EdgeLabelRenderer>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              'absolute pointer-events-all nodrag nopan',
              'px-2 py-1 rounded-md text-xs font-medium',
              'bg-zinc-800 border border-zinc-700',
              'text-zinc-300 shadow-md',
              selected && 'ring-1 ring-blue-500/50'
            )}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {data.label}
          </motion.div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const CustomEdge = memo(CustomEdgeComponent);
