import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import {
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react'
import { cn, formatDate, formatDuration } from '../lib/utils'
import { useState } from 'react'
import type { Id } from '../../convex/_generated/dataModel'
import type { ExecutionStatus, StepStatus } from '../types/workflow'

interface Execution {
  _id: Id<'executions'>
  workflowId: Id<'workflows'>
  status: ExecutionStatus
  startedAt: number
  completedAt?: number
  error?: string
  stepResults: Array<{
    nodeId: string
    nodeName: string
    status: StepStatus
    duration?: number
  }>
}

interface ExecutionLog {
  _id: Id<'executionLogs'>
  executionId: Id<'executions'>
  timestamp: number
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  nodeId?: string
}

export function ExecutionList() {
  const executions = useQuery(api.executions.listRecent, { limit: 50 }) as Execution[] | undefined
  const [selectedExecution, setSelectedExecution] = useState<Id<'executions'> | null>(null)

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      case 'cancelled':
        return <AlertCircle className="h-5 w-5 text-gray-400" />
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />
    }
  }

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      running: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    }
    return styles[status] || styles.pending
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Executions</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Monitor your workflow execution history
        </p>
      </div>

      {executions === undefined ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="animate-pulse bg-white dark:bg-gray-800 rounded-xl p-4 h-20"
            />
          ))}
        </div>
      ) : executions.length === 0 ? (
        <div className="text-center py-16">
          <Clock className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No executions yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Run a workflow to see execution history here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {executions.map((execution) => (
            <div
              key={execution._id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <button
                onClick={() =>
                  setSelectedExecution(
                    selectedExecution === execution._id ? null : execution._id
                  )
                }
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {statusIcon(execution.status)}
                  <div className="text-left">
                    <div className="font-medium text-gray-900 dark:text-white">
                      Workflow Execution
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(execution.startedAt)}
                      {execution.completedAt && (
                        <span className="ml-2">
                          • {formatDuration(execution.completedAt - execution.startedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', statusBadge(execution.status))}>
                    {execution.status}
                  </span>
                  <ChevronRight
                    className={cn(
                      'h-5 w-5 text-gray-400 transition-transform',
                      selectedExecution === execution._id && 'rotate-90'
                    )}
                  />
                </div>
              </button>

              {/* Expanded details */}
              {selectedExecution === execution._id && (
                <ExecutionDetails executionId={execution._id} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ExecutionDetails({ executionId }: { executionId: Id<'executions'> }) {
  const execution = useQuery(api.executions.get, { id: executionId }) as Execution | null | undefined
  const logs = useQuery(api.executions.getLogs, { executionId }) as ExecutionLog[] | undefined

  if (!execution) return null

  const stepStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'skipped':
        return <AlertCircle className="h-4 w-4 text-gray-400" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50">
      {/* Step results */}
      {execution.stepResults.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Steps
          </h4>
          <div className="space-y-2">
            {execution.stepResults.map((step, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-gray-800"
              >
                <div className="flex items-center gap-2">
                  {stepStatusIcon(step.status)}
                  <span className="text-sm text-gray-900 dark:text-white">
                    {step.nodeName}
                  </span>
                </div>
                {step.duration && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDuration(step.duration)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error message */}
      {execution.error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <h4 className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">
            Error
          </h4>
          <p className="text-sm text-red-600 dark:text-red-300 font-mono">
            {execution.error}
          </p>
        </div>
      )}

      {/* Logs */}
      {logs && logs.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Logs
          </h4>
          <div className="rounded-lg bg-gray-900 p-3 max-h-48 overflow-y-auto">
            {logs.map((log) => (
              <div key={log._id} className="flex gap-2 text-xs font-mono">
                <span className="text-gray-500">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span
                  className={cn(
                    log.level === 'error'
                      ? 'text-red-400'
                      : log.level === 'warn'
                        ? 'text-yellow-400'
                        : 'text-gray-300'
                  )}
                >
                  [{log.level.toUpperCase()}]
                </span>
                <span className="text-gray-300">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
