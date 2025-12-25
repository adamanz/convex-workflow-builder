import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Loader2,
  X,
  Clock,
  SkipForward,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import { useState } from 'react';
import { cn, formatDuration, safeStringify, truncate } from '../../lib/utils';
import type { StepResult, StepStatus } from '../../types/workflow';

interface StepProgressProps {
  steps: StepResult[];
  currentStepId?: string;
  onRetryStep?: (nodeId: string) => void;
  className?: string;
  compact?: boolean;
}

/**
 * Step status configuration
 */
const stepStatusConfig: Record<
  StepStatus,
  {
    icon: typeof Check;
    color: string;
    bgColor: string;
    borderColor: string;
    label: string;
  }
> = {
  pending: {
    icon: Clock,
    color: 'text-zinc-500',
    bgColor: 'bg-zinc-800',
    borderColor: 'border-zinc-700',
    label: 'Pending',
  },
  running: {
    icon: Loader2,
    color: 'text-blue-400',
    bgColor: 'bg-blue-950/50',
    borderColor: 'border-blue-800',
    label: 'Running',
  },
  completed: {
    icon: Check,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-950/50',
    borderColor: 'border-emerald-800',
    label: 'Completed',
  },
  failed: {
    icon: X,
    color: 'text-red-400',
    bgColor: 'bg-red-950/50',
    borderColor: 'border-red-800',
    label: 'Failed',
  },
  skipped: {
    icon: SkipForward,
    color: 'text-amber-400',
    bgColor: 'bg-amber-950/50',
    borderColor: 'border-amber-800',
    label: 'Skipped',
  },
};

/**
 * Single step item component
 */
function StepItem({
  step,
  index,
  isLast,
  isCurrent,
  onRetry,
  compact,
}: {
  step: StepResult;
  index: number;
  isLast: boolean;
  isCurrent: boolean;
  onRetry?: () => void;
  compact: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = stepStatusConfig[step.status];
  const StatusIcon = config.icon;

  const hasDetails = step.output || step.error || step.input;

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      {/* Connector line */}
      {!isLast && (
        <div
          className={cn(
            'absolute left-4 top-10 w-0.5 h-full -translate-x-1/2',
            step.status === 'completed'
              ? 'bg-gradient-to-b from-emerald-600 to-zinc-700'
              : step.status === 'running'
                ? 'bg-gradient-to-b from-blue-600 to-zinc-700'
                : 'bg-zinc-700'
          )}
        />
      )}

      <div
        className={cn(
          'relative flex items-start gap-3 p-3 rounded-lg transition-colors',
          isCurrent && 'bg-blue-950/20 border border-blue-800/30',
          !isCurrent && 'hover:bg-zinc-900/50'
        )}
      >
        {/* Status icon */}
        <div
          className={cn(
            'relative flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0',
            config.bgColor,
            'border',
            config.borderColor
          )}
        >
          <motion.div
            animate={
              step.status === 'running'
                ? { rotate: 360 }
                : isCurrent
                  ? { scale: [1, 1.1, 1] }
                  : {}
            }
            transition={
              step.status === 'running'
                ? { duration: 1, repeat: Infinity, ease: 'linear' }
                : isCurrent
                  ? { duration: 1.5, repeat: Infinity }
                  : {}
            }
          >
            <StatusIcon className={cn('w-4 h-4', config.color)} />
          </motion.div>

          {/* Pulse animation for current step */}
          {isCurrent && step.status === 'running' && (
            <motion.div
              className="absolute inset-0 rounded-full bg-blue-500"
              animate={{
                scale: [1, 1.5],
                opacity: [0.4, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeOut',
              }}
            />
          )}
        </div>

        {/* Step content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h4
                className={cn(
                  'text-sm font-medium truncate',
                  step.status === 'pending' ? 'text-zinc-400' : 'text-zinc-200'
                )}
              >
                {step.nodeName}
              </h4>
              {step.retryCount && step.retryCount > 0 && (
                <span className="text-xs text-amber-400 bg-amber-950/50 px-1.5 py-0.5 rounded">
                  Retry #{step.retryCount}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Duration */}
              {step.duration && (
                <span className="text-xs font-mono text-zinc-500">
                  {formatDuration(step.duration)}
                </span>
              )}

              {/* Status badge */}
              {!compact && (
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full',
                    config.bgColor,
                    config.color
                  )}
                >
                  {config.label}
                </span>
              )}

              {/* Retry button for failed steps */}
              {step.status === 'failed' && onRetry && (
                <motion.button
                  className={cn(
                    'p-1 rounded text-zinc-400 hover:text-zinc-200',
                    'hover:bg-zinc-800 transition-colors'
                  )}
                  onClick={onRetry}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Retry this step"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </motion.button>
              )}

              {/* Expand/collapse button */}
              {hasDetails && (
                <button
                  className={cn(
                    'p-1 rounded text-zinc-400 hover:text-zinc-200',
                    'hover:bg-zinc-800 transition-colors'
                  )}
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Error preview */}
          {step.error && !isExpanded && (
            <div className="flex items-start gap-1.5 mt-1">
              <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-400 truncate">
                {truncate(step.error, 60)}
              </p>
            </div>
          )}

          {/* Expanded details */}
          <AnimatePresence>
            {isExpanded && hasDetails && (
              <motion.div
                className="mt-3 space-y-3"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* Input */}
                {step.input && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-zinc-500">Input</p>
                    <pre className="text-xs text-zinc-400 bg-zinc-900 p-2 rounded-md overflow-x-auto max-h-32 font-mono">
                      {safeStringify(step.input)}
                    </pre>
                  </div>
                )}

                {/* Output */}
                {step.output && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-zinc-500">Output</p>
                    <pre className="text-xs text-emerald-400 bg-zinc-900 p-2 rounded-md overflow-x-auto max-h-32 font-mono">
                      {safeStringify(step.output)}
                    </pre>
                  </div>
                )}

                {/* Error */}
                {step.error && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-zinc-500">Error</p>
                    <pre className="text-xs text-red-400 bg-red-950/30 p-2 rounded-md overflow-x-auto max-h-32 font-mono whitespace-pre-wrap">
                      {step.error}
                    </pre>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Loading skeleton for step progress
 */
function StepProgressSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <div className="w-8 h-8 rounded-full bg-zinc-800" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 bg-zinc-800 rounded" />
            <div className="h-3 w-1/4 bg-zinc-800 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Step-by-step progress component
 *
 * Shows all workflow steps in order with visual indicators for
 * completed, current, and pending steps. Includes timing information
 * and the ability to view step details.
 */
export function StepProgress({
  steps,
  currentStepId,
  onRetryStep,
  className,
  compact = false,
}: StepProgressProps) {
  if (!steps || steps.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center h-32 text-zinc-500',
          className
        )}
      >
        <p className="text-sm">No steps to display</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      {steps.map((step, index) => (
        <StepItem
          key={step.nodeId}
          step={step}
          index={index}
          isLast={index === steps.length - 1}
          isCurrent={step.nodeId === currentStepId}
          onRetry={onRetryStep ? () => onRetryStep(step.nodeId) : undefined}
          compact={compact}
        />
      ))}
    </div>
  );
}

/**
 * Step summary showing counts by status
 */
export function StepSummary({ steps }: { steps: StepResult[] }) {
  const counts = steps.reduce(
    (acc, step) => {
      acc[step.status] = (acc[step.status] || 0) + 1;
      return acc;
    },
    {} as Record<StepStatus, number>
  );

  return (
    <div className="flex items-center gap-4 text-xs">
      {Object.entries(counts).map(([status, count]) => {
        const config = stepStatusConfig[status as StepStatus];
        return (
          <div
            key={status}
            className={cn('flex items-center gap-1.5', config.color)}
          >
            <config.icon className="w-3.5 h-3.5" />
            <span>
              {count} {config.label.toLowerCase()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export { StepProgressSkeleton };
export default StepProgress;
