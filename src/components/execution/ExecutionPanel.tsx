import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  RotateCcw,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';
import { useState } from 'react';
import { cn, formatDuration, formatRelativeTime } from '../../lib/utils';
import { useExecution } from '../../hooks/useExecution';
import type { ExecutionStatus } from '../../types/workflow';

interface ExecutionPanelProps {
  executionId: string | null;
  className?: string;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

/**
 * Status configuration for visual styling
 */
const statusConfig: Record<
  ExecutionStatus,
  {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: typeof Play;
    animate?: boolean;
  }
> = {
  pending: {
    label: 'Pending',
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-800',
    borderColor: 'border-zinc-700',
    icon: Clock,
  },
  running: {
    label: 'Running',
    color: 'text-blue-400',
    bgColor: 'bg-blue-950/50',
    borderColor: 'border-blue-800',
    icon: Loader2,
    animate: true,
  },
  completed: {
    label: 'Completed',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-950/50',
    borderColor: 'border-emerald-800',
    icon: CheckCircle2,
  },
  failed: {
    label: 'Failed',
    color: 'text-red-400',
    bgColor: 'bg-red-950/50',
    borderColor: 'border-red-800',
    icon: XCircle,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-amber-400',
    bgColor: 'bg-amber-950/50',
    borderColor: 'border-amber-800',
    icon: AlertTriangle,
  },
};

/**
 * Loading skeleton for the execution panel
 */
function ExecutionPanelSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-6 w-24 bg-zinc-800 rounded" />
        <div className="h-6 w-16 bg-zinc-800 rounded" />
      </div>
      <div className="h-2 w-full bg-zinc-800 rounded-full" />
      <div className="space-y-2">
        <div className="h-4 w-3/4 bg-zinc-800 rounded" />
        <div className="h-4 w-1/2 bg-zinc-800 rounded" />
      </div>
    </div>
  );
}

/**
 * Progress bar component with animation
 */
function ProgressBar({
  progress,
  status,
}: {
  progress: number;
  status: ExecutionStatus;
}) {
  const config = statusConfig[status];

  return (
    <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
      <motion.div
        className={cn(
          'absolute inset-y-0 left-0 rounded-full',
          status === 'running' && 'bg-gradient-to-r from-blue-500 to-blue-400',
          status === 'completed' && 'bg-emerald-500',
          status === 'failed' && 'bg-red-500',
          status === 'cancelled' && 'bg-amber-500',
          status === 'pending' && 'bg-zinc-600'
        )}
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
      {status === 'running' && (
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          style={{ width: '30%' }}
          animate={{ x: ['0%', '400%'] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      )}
      <span
        className={cn(
          'absolute inset-0 flex items-center justify-center text-[10px] font-medium',
          config.color
        )}
      >
        {progress > 10 && `${progress}%`}
      </span>
    </div>
  );
}

/**
 * Current step indicator with pulse animation
 */
function CurrentStepIndicator({
  stepName,
  startedAt,
}: {
  stepName: string;
  startedAt: number;
}) {
  return (
    <motion.div
      className="flex items-center gap-3 p-3 bg-blue-950/30 border border-blue-800/50 rounded-lg"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <div className="relative">
        <motion.div
          className="w-3 h-3 rounded-full bg-blue-500"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [1, 0.7, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute inset-0 rounded-full bg-blue-400"
          animate={{
            scale: [1, 2],
            opacity: [0.5, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-blue-300 truncate">
          {stepName}
        </p>
        <p className="text-xs text-blue-400/60">
          Started {formatRelativeTime(startedAt)}
        </p>
      </div>
      <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
    </motion.div>
  );
}

/**
 * Execution control buttons
 */
function ExecutionControls({
  status,
  onCancel,
  onRetry,
  isDisabled,
}: {
  status: ExecutionStatus;
  onCancel: () => void;
  onRetry: () => void;
  isDisabled: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {status === 'running' && (
        <motion.button
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium',
            'bg-red-950/50 text-red-400 border border-red-800/50',
            'hover:bg-red-900/50 hover:border-red-700',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors'
          )}
          onClick={onCancel}
          disabled={isDisabled}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Pause className="w-3.5 h-3.5" />
          Cancel
        </motion.button>
      )}
      {(status === 'failed' || status === 'cancelled') && (
        <motion.button
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium',
            'bg-blue-950/50 text-blue-400 border border-blue-800/50',
            'hover:bg-blue-900/50 hover:border-blue-700',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors'
          )}
          onClick={onRetry}
          disabled={isDisabled}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Retry
        </motion.button>
      )}
    </div>
  );
}

/**
 * Real-time execution status panel
 *
 * Displays current execution status, progress, and controls.
 * Uses Convex subscriptions for real-time updates and Framer Motion
 * for smooth animations.
 */
export function ExecutionPanel({
  executionId,
  className,
  onClose,
  collapsed = false,
  onToggleCollapse,
}: ExecutionPanelProps) {
  const [isControlsDisabled, setIsControlsDisabled] = useState(false);

  const {
    execution,
    isLoading,
    status,
    currentStep,
    progress,
    elapsedTime,
    estimatedTimeRemaining,
    cancel,
    retry,
    isConnected,
  } = useExecution(executionId);

  const handleCancel = async () => {
    setIsControlsDisabled(true);
    try {
      await cancel();
    } finally {
      setIsControlsDisabled(false);
    }
  };

  const handleRetry = async () => {
    setIsControlsDisabled(true);
    try {
      await retry();
    } finally {
      setIsControlsDisabled(false);
    }
  };

  // No execution selected
  if (!executionId) {
    return (
      <div
        className={cn(
          'p-4 bg-zinc-950 border border-zinc-800 rounded-lg',
          className
        )}
      >
        <div className="flex items-center justify-center h-32 text-zinc-500">
          <p className="text-sm">No execution selected</p>
        </div>
      </div>
    );
  }

  const config = status ? statusConfig[status] : statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <motion.div
      className={cn(
        'bg-zinc-950 border rounded-lg overflow-hidden',
        config.borderColor,
        className
      )}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between p-4 border-b',
          config.bgColor,
          config.borderColor
        )}
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={config.animate ? { rotate: 360 } : {}}
            transition={
              config.animate
                ? { duration: 1, repeat: Infinity, ease: 'linear' }
                : {}
            }
          >
            <StatusIcon className={cn('w-5 h-5', config.color)} />
          </motion.div>
          <div>
            <h3 className={cn('text-sm font-semibold', config.color)}>
              {config.label}
            </h3>
            {!isConnected && (
              <p className="text-xs text-zinc-500">Connecting...</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status && (
            <ExecutionControls
              status={status}
              onCancel={handleCancel}
              onRetry={handleRetry}
              isDisabled={isControlsDisabled}
            />
          )}
          {onToggleCollapse && (
            <button
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
              onClick={onToggleCollapse}
            >
              {collapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          )}
          {onClose && (
            <button
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            className="p-4 space-y-4"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {isLoading ? (
              <ExecutionPanelSkeleton />
            ) : (
              <>
                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <ProgressBar progress={progress} status={status!} />
                </div>

                {/* Current step */}
                <AnimatePresence mode="wait">
                  {currentStep && (
                    <CurrentStepIndicator
                      stepName={currentStep.nodeName}
                      startedAt={currentStep.startedAt}
                    />
                  )}
                </AnimatePresence>

                {/* Timing info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-zinc-500">Elapsed Time</p>
                    <p className="text-sm font-mono text-zinc-300">
                      {formatDuration(elapsedTime)}
                    </p>
                  </div>
                  {estimatedTimeRemaining !== null && (
                    <div className="space-y-1">
                      <p className="text-xs text-zinc-500">Est. Remaining</p>
                      <p className="text-sm font-mono text-zinc-300">
                        {formatDuration(estimatedTimeRemaining)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Error message */}
                <AnimatePresence>
                  {execution?.error && (
                    <motion.div
                      className="p-3 bg-red-950/30 border border-red-800/50 rounded-lg"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <div className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-300">
                          {execution.error}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Execution metadata */}
                {execution?.startedAt && (
                  <div className="pt-2 border-t border-zinc-800">
                    <p className="text-xs text-zinc-500">
                      Started {formatRelativeTime(execution.startedAt)}
                    </p>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default ExecutionPanel;
