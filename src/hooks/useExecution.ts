import { useQuery, useMutation } from 'convex/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import type {
  WorkflowExecution,
  ExecutionStatus,
  StepResult,
  ExecutionLog,
} from '../types/workflow';

/**
 * Extended execution type with workflow data and logs
 */
interface ExecutionWithDetails extends WorkflowExecution {
  workflow?: {
    _id: string;
    name: string;
    nodes: Array<{ id: string; type: string; position: { x: number; y: number }; data: { label: string; config: unknown } }>;
    edges: Array<{ id: string; source: string; target: string }>;
  } | null;
  recentLogs?: ExecutionLog[];
}

/**
 * Execution state returned by the useExecution hook
 */
export interface ExecutionState {
  // Execution data
  execution: ExecutionWithDetails | null | undefined;
  logs: ExecutionLog[];
  isLoading: boolean;
  error: string | null;

  // Computed values
  status: ExecutionStatus | null;
  currentStep: StepResult | null;
  completedSteps: StepResult[];
  pendingSteps: StepResult[];
  failedSteps: StepResult[];
  progress: number;
  elapsedTime: number;
  estimatedTimeRemaining: number | null;

  // Actions
  cancel: () => Promise<void>;
  retry: () => Promise<string | void>;
  retryStep: (nodeId: string) => Promise<void>;

  // Real-time tracking
  isConnected: boolean;
}

/**
 * Hook options
 */
export interface UseExecutionOptions {
  /** Poll interval for elapsed time updates (ms) */
  pollInterval?: number;
  /** Enable log streaming */
  enableLogs?: boolean;
  /** Maximum number of logs to keep in memory */
  maxLogs?: number;
}

/**
 * Custom hook for managing workflow execution state
 *
 * Provides real-time updates from Convex, execution controls,
 * and computed values for UI rendering.
 */
export function useExecution(
  executionId: string | null,
  options: UseExecutionOptions = {}
): ExecutionState {
  const {
    pollInterval = 100,
    enableLogs = true,
    maxLogs = 1000,
  } = options;

  // Real-time elapsed time tracking
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // Query execution state from Convex using getExecution
  const execution = useQuery(
    api.executions.getExecution,
    executionId ? { id: executionId as Id<'workflowExecutions'> } : 'skip'
  ) as ExecutionWithDetails | null | undefined;

  // Query logs if enabled using getExecutionLogs
  const logs = useQuery(
    api.executions.getExecutionLogs,
    executionId && enableLogs
      ? { executionId: executionId as Id<'workflowExecutions'>, limit: maxLogs }
      : 'skip'
  ) as ExecutionLog[] | undefined;

  // Mutations for execution control
  const cancelMutation = useMutation(api.executions.cancelExecution);
  const retryMutation = useMutation(api.executions.retryExecution);

  // Track connection status
  useEffect(() => {
    setIsConnected(execution !== undefined);
  }, [execution]);

  // Update elapsed time for running executions
  useEffect(() => {
    if (!execution || execution.status !== 'running') {
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - execution.startedAt);
    }, pollInterval);

    return () => clearInterval(interval);
  }, [execution, pollInterval]);

  // Calculate completed elapsed time for finished executions
  useEffect(() => {
    if (execution?.completedAt) {
      setElapsedTime(execution.completedAt - execution.startedAt);
    }
  }, [execution?.completedAt, execution?.startedAt]);

  // Compute step categories
  const stepCategories = useMemo(() => {
    if (!execution?.stepResults) {
      return {
        completed: [] as StepResult[],
        pending: [] as StepResult[],
        failed: [] as StepResult[],
        current: null as StepResult | null,
      };
    }

    const completed: StepResult[] = [];
    const pending: StepResult[] = [];
    const failed: StepResult[] = [];
    let current: StepResult | null = null;

    for (const step of execution.stepResults) {
      // Add nodeName from the workflow nodes if available
      const node = execution.workflow?.nodes.find(n => n.id === step.nodeId);
      const enrichedStep = {
        ...step,
        nodeName: node?.data.label || step.nodeId,
        duration: step.completedAt ? step.completedAt - step.startedAt : undefined,
      };

      switch (step.status) {
        case 'completed':
          completed.push(enrichedStep);
          break;
        case 'pending':
          pending.push(enrichedStep);
          break;
        case 'failed':
          failed.push(enrichedStep);
          break;
        case 'running':
          current = enrichedStep;
          break;
      }
    }

    return { completed, pending, failed, current };
  }, [execution?.stepResults, execution?.workflow?.nodes]);

  // Calculate progress percentage
  const progress = useMemo(() => {
    if (!execution?.stepResults || execution.stepResults.length === 0) {
      // If no step results yet, check workflow nodes
      if (execution?.workflow?.nodes) {
        return 0;
      }
      return 0;
    }

    const total = execution.stepResults.length;
    const completed = stepCategories.completed.length;
    const running = stepCategories.current ? 0.5 : 0;

    return Math.round(((completed + running) / total) * 100);
  }, [execution?.stepResults, execution?.workflow?.nodes, stepCategories]);

  // Estimate time remaining based on average step duration
  const estimatedTimeRemaining = useMemo(() => {
    if (!execution || execution.status !== 'running') {
      return null;
    }

    const { completed, pending, current } = stepCategories;

    if (completed.length === 0) {
      return null;
    }

    // Calculate average step duration from completed steps
    const totalDuration = completed.reduce(
      (sum, step) => sum + (step.duration || 0),
      0
    );
    const avgDuration = totalDuration / completed.length;

    // Estimate remaining time
    const remainingSteps = pending.length + (current ? 0.5 : 0);
    return Math.round(avgDuration * remainingSteps);
  }, [execution, stepCategories]);

  // Action handlers
  const cancel = useCallback(async () => {
    if (!executionId) return;
    try {
      await cancelMutation({ executionId: executionId as Id<'workflowExecutions'> });
    } catch (err) {
      console.error('Failed to cancel execution:', err);
      throw err;
    }
  }, [executionId, cancelMutation]);

  const retry = useCallback(async () => {
    if (!executionId) return;
    try {
      const newExecutionId = await retryMutation({ executionId: executionId as Id<'workflowExecutions'> });
      return newExecutionId;
    } catch (err) {
      console.error('Failed to retry execution:', err);
      throw err;
    }
  }, [executionId, retryMutation]);

  // Note: retryStep is not implemented in the backend yet
  const retryStep = useCallback(
    async (_nodeId: string) => {
      console.warn('retryStep is not yet implemented');
      // This would need to be added to the backend
    },
    []
  );

  return {
    // Execution data
    execution,
    logs: logs || execution?.recentLogs || [],
    isLoading: execution === undefined,
    error: execution?.error || null,

    // Computed values
    status: execution?.status || null,
    currentStep: stepCategories.current,
    completedSteps: stepCategories.completed,
    pendingSteps: stepCategories.pending,
    failedSteps: stepCategories.failed,
    progress,
    elapsedTime,
    estimatedTimeRemaining,

    // Actions
    cancel,
    retry,
    retryStep,

    // Real-time tracking
    isConnected,
  };
}

/**
 * Hook for subscribing to multiple executions (e.g., for a list view)
 */
export function useExecutionList(workflowId?: string, status?: ExecutionStatus) {
  const executions = useQuery(
    api.executions.listExecutions,
    workflowId
      ? { workflowId: workflowId as Id<'workflows'>, status, limit: 50 }
      : { status, limit: 50 }
  );

  return {
    executions: executions || [],
    isLoading: executions === undefined,
  };
}

/**
 * Hook for execution statistics
 */
export function useExecutionStats(workflowId?: string, timeRangeMs?: number) {
  const stats = useQuery(
    api.executions.getExecutionStats,
    workflowId
      ? { workflowId: workflowId as Id<'workflows'>, timeRangeMs }
      : { timeRangeMs }
  );

  return {
    stats: stats || {
      total: 0,
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      averageDurationMs: 0,
      successRate: 0,
    },
    isLoading: stats === undefined,
  };
}
