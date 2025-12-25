/**
 * Execution Viewer Page
 *
 * Real-time execution monitoring with workflow canvas,
 * step progress, log viewer, and execution controls.
 */
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Play,
  Pause,
  RotateCcw,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  PanelBottomClose,
  PanelRightClose,
  Maximize2,
  Minimize2,
  ExternalLink,
  Copy,
  Check,
  Info,
} from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import type {
  ExecutionStatus,
  StepResult,
  WorkflowNode,
  WorkflowEdge,
} from '../types/workflow';
import { cn, formatDuration, formatRelativeTime, safeStringify } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { StepProgress } from '../components/execution/StepProgress';
import { LogViewer } from '../components/execution/LogViewer';
import { LiveCanvas } from '../components/execution/LiveCanvas';

interface ExecutionViewerProps {
  executionId: string;
  onBack?: () => void;
  onNavigateToEditor?: (workflowId: string) => void;
}

// Status configuration
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
 * Header with execution info and controls
 */
function ExecutionHeader({
  execution,
  onBack,
  onCancel,
  onRetry,
  onNavigateToEditor,
}: {
  execution: {
    _id: Id<'workflowExecutions'>;
    status: ExecutionStatus;
    startedAt: number;
    completedAt?: number;
    retryCount: number;
    workflow: {
      _id: Id<'workflows'>;
      name: string;
    } | null;
  };
  onBack?: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onNavigateToEditor?: (workflowId: string) => void;
}) {
  const config = statusConfig[execution.status];
  const StatusIcon = config.icon;
  const [elapsedTime, setElapsedTime] = useState(0);

  // Update elapsed time for running executions
  useEffect(() => {
    if (execution.status === 'running') {
      const interval = setInterval(() => {
        setElapsedTime(Date.now() - execution.startedAt);
      }, 100);
      return () => clearInterval(interval);
    } else if (execution.completedAt) {
      setElapsedTime(execution.completedAt - execution.startedAt);
    }
  }, [execution.status, execution.startedAt, execution.completedAt]);

  return (
    <header className="h-16 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-foreground">
              {execution.workflow?.name || 'Unknown Workflow'}
            </h1>
            {execution.workflow && onNavigateToEditor && (
              <button
                className="p-1 text-zinc-500 hover:text-zinc-300 rounded hover:bg-zinc-800 transition-colors"
                onClick={() => onNavigateToEditor(execution.workflow!._id)}
                title="View workflow"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span>Started {formatRelativeTime(execution.startedAt)}</span>
            {execution.retryCount > 0 && (
              <Badge variant="warning" className="text-[10px]">
                Retry #{execution.retryCount}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Status badge with timer */}
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg',
            config.bgColor,
            'border',
            config.borderColor
          )}
        >
          <motion.div
            animate={config.animate ? { rotate: 360 } : {}}
            transition={
              config.animate
                ? { duration: 1, repeat: Infinity, ease: 'linear' }
                : {}
            }
          >
            <StatusIcon className={cn('w-4 h-4', config.color)} />
          </motion.div>
          <span className={cn('text-sm font-medium', config.color)}>
            {config.label}
          </span>
          <span className="text-sm font-mono text-zinc-400">
            {formatDuration(elapsedTime)}
          </span>
        </div>

        {/* Action buttons */}
        {execution.status === 'running' && (
          <Button variant="destructive" size="sm" onClick={onCancel}>
            <Pause className="w-4 h-4 mr-1" />
            Cancel
          </Button>
        )}
        {(execution.status === 'failed' || execution.status === 'cancelled') && (
          <Button variant="default" size="sm" onClick={onRetry}>
            <RotateCcw className="w-4 h-4 mr-1" />
            Retry
          </Button>
        )}
      </div>
    </header>
  );
}

/**
 * Input/Output data display
 */
function DataDisplay({
  title,
  data,
  variant = 'default',
}: {
  title: string;
  data: unknown;
  variant?: 'default' | 'error' | 'success';
}) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(safeStringify(data));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const colorClasses = {
    default: 'text-zinc-300',
    error: 'text-red-400',
    success: 'text-emerald-400',
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-zinc-400">
          {title}
        </CardTitle>
        <button
          className="p-1 text-zinc-500 hover:text-zinc-300 rounded hover:bg-zinc-800 transition-colors"
          onClick={handleCopy}
        >
          {isCopied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </CardHeader>
      <CardContent className="py-0 pb-3 px-4">
        <pre
          className={cn(
            'text-xs font-mono overflow-x-auto max-h-40 whitespace-pre-wrap',
            colorClasses[variant]
          )}
        >
          {data ? safeStringify(data) : 'No data'}
        </pre>
      </CardContent>
    </Card>
  );
}

/**
 * Step sidebar with progress
 */
function StepSidebar({
  steps,
  currentStepId,
  onRetryStep,
  isOpen,
  onToggle,
}: {
  steps: StepResult[];
  currentStepId?: string;
  onRetryStep: (nodeId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        'bg-zinc-950 border-l border-zinc-800 flex flex-col transition-all duration-200',
        isOpen ? 'w-80' : 'w-12'
      )}
    >
      <div className="h-10 flex items-center justify-between px-3 border-b border-zinc-800">
        {isOpen && (
          <span className="text-sm font-medium text-zinc-300">Steps</span>
        )}
        <button
          className="p-1 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800 transition-colors ml-auto"
          onClick={onToggle}
        >
          <PanelRightClose className={cn('w-4 h-4', !isOpen && 'rotate-180')} />
        </button>
      </div>

      {isOpen && (
        <div className="flex-1 overflow-y-auto p-3">
          <StepProgress
            steps={steps}
            currentStepId={currentStepId}
            onRetryStep={onRetryStep}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Bottom panel with logs and data
 */
function BottomPanel({
  logs,
  input,
  output,
  error,
  isOpen,
  onToggle,
  isMaximized,
  onToggleMaximize,
}: {
  logs: Array<{
    _id: string;
    timestamp: number;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    nodeId?: string;
    data?: unknown;
  }>;
  input: unknown;
  output: unknown;
  error?: string;
  isOpen: boolean;
  onToggle: () => void;
  isMaximized: boolean;
  onToggleMaximize: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'logs' | 'input' | 'output'>('logs');

  return (
    <div
      className={cn(
        'bg-zinc-950 border-t border-zinc-800 flex flex-col transition-all duration-200',
        isOpen ? (isMaximized ? 'h-[60vh]' : 'h-64') : 'h-10'
      )}
    >
      {/* Tab bar */}
      <div className="h-10 flex items-center justify-between px-3 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-1">
          {(['logs', 'input', 'output'] as const).map((tab) => (
            <button
              key={tab}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded transition-colors',
                activeTab === tab
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              )}
              onClick={() => {
                setActiveTab(tab);
                if (!isOpen) onToggle();
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'logs' && logs.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-zinc-700 rounded-full">
                  {logs.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            className="p-1 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800 transition-colors"
            onClick={onToggleMaximize}
            disabled={!isOpen}
          >
            {isMaximized ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
          <button
            className="p-1 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800 transition-colors"
            onClick={onToggle}
          >
            {isOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      {isOpen && (
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === 'logs' && (
              <motion.div
                key="logs"
                className="h-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <LogViewer
                  logs={logs}
                  className="h-full border-0 rounded-none"
                  maxHeight="100%"
                />
              </motion.div>
            )}
            {activeTab === 'input' && (
              <motion.div
                key="input"
                className="h-full p-4 overflow-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <DataDisplay title="Input Data" data={input} />
              </motion.div>
            )}
            {activeTab === 'output' && (
              <motion.div
                key="output"
                className="h-full p-4 overflow-auto space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {error && (
                  <DataDisplay title="Error" data={error} variant="error" />
                )}
                <DataDisplay
                  title="Output Data"
                  data={output}
                  variant={output ? 'success' : 'default'}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/**
 * Loading skeleton
 */
function ExecutionViewerSkeleton() {
  return (
    <div className="h-screen flex flex-col bg-zinc-950 animate-pulse">
      <header className="h-16 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 bg-zinc-800 rounded" />
          <div className="space-y-2">
            <div className="h-5 w-48 bg-zinc-800 rounded" />
            <div className="h-3 w-32 bg-zinc-800 rounded" />
          </div>
        </div>
        <div className="h-9 w-32 bg-zinc-800 rounded" />
      </header>
      <div className="flex-1 flex">
        <div className="flex-1 bg-zinc-900/50" />
        <div className="w-80 bg-zinc-950 border-l border-zinc-800" />
      </div>
      <div className="h-64 bg-zinc-950 border-t border-zinc-800" />
    </div>
  );
}

/**
 * Main Execution Viewer component
 */
export function ExecutionViewer({
  executionId,
  onBack,
  onNavigateToEditor,
}: ExecutionViewerProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(true);
  const [isBottomPanelMaximized, setIsBottomPanelMaximized] = useState(false);

  // Convex queries
  const execution = useQuery(api.executions.getExecution, {
    id: executionId as Id<'workflowExecutions'>,
  });

  // Mutations
  const cancelExecution = useMutation(api.executions.cancelExecution);
  const retryExecution = useMutation(api.executions.retryExecution);

  // Get workflow nodes and edges
  const workflowNodes = useMemo((): WorkflowNode[] => {
    if (!execution?.workflow?.nodes) return [];
    return execution.workflow.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        label: node.data.label,
        config: node.data.config,
      },
    }));
  }, [execution?.workflow?.nodes]);

  const workflowEdges = useMemo((): WorkflowEdge[] => {
    if (!execution?.workflow?.edges) return [];
    return execution.workflow.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      label: edge.label,
    }));
  }, [execution?.workflow?.edges]);

  // Handlers
  const handleCancel = async () => {
    await cancelExecution({ executionId: executionId as Id<'workflowExecutions'> });
  };

  const handleRetry = async () => {
    await retryExecution({ executionId: executionId as Id<'workflowExecutions'> });
  };

  const handleRetryStep = async (nodeId: string) => {
    // Note: This would need a specific retryStep mutation
    console.log('Retry step:', nodeId);
  };

  // Loading state
  if (!execution) {
    return <ExecutionViewerSkeleton />;
  }

  // Map step results to the expected format
  const stepResults: StepResult[] = execution.stepResults.map((step) => ({
    nodeId: step.nodeId,
    nodeName: workflowNodes.find((n) => n.id === step.nodeId)?.data.label || step.nodeId,
    status: step.status,
    output: step.output,
    error: step.error,
    startedAt: step.startedAt,
    completedAt: step.completedAt,
    duration: step.completedAt ? step.completedAt - step.startedAt : undefined,
  }));

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      {/* Header */}
      <ExecutionHeader
        execution={execution}
        onBack={onBack}
        onCancel={handleCancel}
        onRetry={handleRetry}
        onNavigateToEditor={onNavigateToEditor}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 relative">
          <LiveCanvas
            nodes={workflowNodes}
            edges={workflowEdges}
            stepResults={stepResults}
            currentStepId={execution.currentStep}
          />

          {/* Status overlay for completed/failed */}
          {(execution.status === 'completed' || execution.status === 'failed') && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div
                className={cn(
                  'flex items-center gap-3 px-6 py-4 rounded-xl backdrop-blur-md',
                  execution.status === 'completed'
                    ? 'bg-emerald-950/80 border border-emerald-800'
                    : 'bg-red-950/80 border border-red-800'
                )}
              >
                {execution.status === 'completed' ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-400" />
                )}
                <div>
                  <p
                    className={cn(
                      'text-lg font-semibold',
                      execution.status === 'completed'
                        ? 'text-emerald-300'
                        : 'text-red-300'
                    )}
                  >
                    {execution.status === 'completed'
                      ? 'Workflow Completed'
                      : 'Workflow Failed'}
                  </p>
                  <p className="text-sm text-zinc-400">
                    Duration: {formatDuration((execution.completedAt || 0) - execution.startedAt)}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Step sidebar */}
        <StepSidebar
          steps={stepResults}
          currentStepId={execution.currentStep}
          onRetryStep={handleRetryStep}
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      </div>

      {/* Bottom panel */}
      <BottomPanel
        logs={execution.recentLogs}
        input={execution.input}
        output={execution.output}
        error={execution.error}
        isOpen={isBottomPanelOpen}
        onToggle={() => setIsBottomPanelOpen(!isBottomPanelOpen)}
        isMaximized={isBottomPanelMaximized}
        onToggleMaximize={() => setIsBottomPanelMaximized(!isBottomPanelMaximized)}
      />
    </div>
  );
}

export default ExecutionViewer;
