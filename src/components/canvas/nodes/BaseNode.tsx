import { memo, type ReactNode } from 'react';
import { Handle, Position } from '@xyflow/react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { StepStatus } from '@/types/workflow';

export interface BaseNodeData {
  label: string;
  description?: string;
  status?: StepStatus;
  [key: string]: unknown;
}

export interface BaseNodeProps {
  id: string;
  data: BaseNodeData;
  selected?: boolean;
  icon: ReactNode;
  accentColor: string;
  showInputHandle?: boolean;
  showOutputHandle?: boolean;
  outputHandles?: Array<{
    id: string;
    position: Position;
    label?: string;
  }>;
  children?: ReactNode;
}

const statusColors: Record<StepStatus, string> = {
  pending: 'bg-zinc-500',
  running: 'bg-blue-500 animate-pulse',
  completed: 'bg-emerald-500',
  failed: 'bg-red-500',
  skipped: 'bg-zinc-400',
};

const statusRingColors: Record<StepStatus, string> = {
  pending: 'ring-zinc-500/20',
  running: 'ring-blue-500/30',
  completed: 'ring-emerald-500/20',
  failed: 'ring-red-500/20',
  skipped: 'ring-zinc-400/20',
};

function BaseNodeComponent({
  data,
  selected = false,
  icon,
  accentColor,
  showInputHandle = true,
  showOutputHandle = true,
  outputHandles,
  children,
}: BaseNodeProps) {
  const status: StepStatus = data.status || 'pending';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'relative min-w-[180px] rounded-lg',
        'bg-zinc-900 border border-zinc-800',
        'shadow-lg shadow-black/20',
        'transition-all duration-200',
        selected && 'ring-2 ring-offset-2 ring-offset-zinc-950',
        selected && accentColor.includes('blue') && 'ring-blue-500/50',
        selected && accentColor.includes('emerald') && 'ring-emerald-500/50',
        selected && accentColor.includes('red') && 'ring-red-500/50',
        selected && accentColor.includes('yellow') && 'ring-yellow-500/50',
        selected && accentColor.includes('purple') && 'ring-purple-500/50',
        !selected && 'hover:border-zinc-700'
      )}
    >
      {/* Input Handle */}
      {showInputHandle && (
        <Handle
          type="target"
          position={Position.Top}
          className={cn(
            '!w-3 !h-3 !bg-zinc-700 !border-2 !border-zinc-600',
            '!-top-1.5',
            'hover:!bg-blue-500 hover:!border-blue-400',
            'transition-colors duration-150'
          )}
        />
      )}

      {/* Node Content */}
      <div className="p-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          {/* Status Indicator */}
          <div
            className={cn(
              'w-2 h-2 rounded-full ring-4',
              statusColors[status],
              statusRingColors[status]
            )}
          />

          {/* Icon */}
          <div
            className={cn(
              'w-8 h-8 rounded-md flex items-center justify-center',
              accentColor
            )}
          >
            {icon}
          </div>

          {/* Label */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-100 truncate">
              {data.label}
            </p>
            {data.description && (
              <p className="text-xs text-zinc-500 truncate">
                {data.description}
              </p>
            )}
          </div>
        </div>

        {/* Custom Content */}
        {children && <div className="mt-3 pt-3 border-t border-zinc-800">{children}</div>}
      </div>

      {/* Output Handle(s) */}
      {showOutputHandle && !outputHandles && (
        <Handle
          type="source"
          position={Position.Bottom}
          className={cn(
            '!w-3 !h-3 !bg-zinc-700 !border-2 !border-zinc-600',
            '!-bottom-1.5',
            'hover:!bg-blue-500 hover:!border-blue-400',
            'transition-colors duration-150'
          )}
        />
      )}

      {/* Multiple Output Handles */}
      {outputHandles?.map((handle, index) => (
        <Handle
          key={handle.id}
          type="source"
          position={handle.position}
          id={handle.id}
          className={cn(
            '!w-3 !h-3 !bg-zinc-700 !border-2 !border-zinc-600',
            handle.position === Position.Bottom && '!-bottom-1.5',
            handle.position === Position.Left && '!-left-1.5',
            handle.position === Position.Right && '!-right-1.5',
            'hover:!bg-blue-500 hover:!border-blue-400',
            'transition-colors duration-150'
          )}
          style={
            handle.position === Position.Bottom
              ? {
                  left: `${((index + 1) / (outputHandles.length + 1)) * 100}%`,
                }
              : undefined
          }
        />
      ))}

      {/* Selection Glow Effect */}
      {selected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn(
            'absolute inset-0 rounded-lg pointer-events-none',
            'bg-gradient-to-b from-white/5 to-transparent'
          )}
        />
      )}
    </motion.div>
  );
}

export const BaseNode = memo(BaseNodeComponent);
