import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import {
  Play,
  Square,
  Globe,
  Database,
  Edit,
  GitBranch,
  Clock,
  GitMerge,
  Repeat,
  Sparkles,
} from 'lucide-react'
import { cn } from '../lib/utils'
import type { NodeType } from '../types/workflow'

interface NodeData {
  label: string
  description?: string
  config: Record<string, unknown>
  isSelected?: boolean
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
}

const nodeConfig: Record<NodeType, {
  icon: typeof Play
  color: string
  bgColor: string
}> = {
  start: { icon: Play, color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' },
  end: { icon: Square, color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' },
  action: { icon: Globe, color: 'text-sky-600', bgColor: 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800' },
  mutation: { icon: Edit, color: 'text-violet-600', bgColor: 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800' },
  query: { icon: Database, color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
  condition: { icon: GitBranch, color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' },
  delay: { icon: Clock, color: 'text-indigo-600', bgColor: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' },
  parallel: { icon: GitMerge, color: 'text-pink-600', bgColor: 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800' },
  loop: { icon: Repeat, color: 'text-teal-600', bgColor: 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800' },
  ai: { icon: Sparkles, color: 'text-purple-600', bgColor: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800' },
}

const statusStyles = {
  pending: 'ring-gray-300',
  running: 'ring-blue-400 ring-2 animate-pulse',
  completed: 'ring-green-400 ring-2',
  failed: 'ring-red-400 ring-2',
  skipped: 'ring-gray-300 opacity-50',
}

function BaseNode({
  data,
  type,
  selected,
}: NodeProps & { type: NodeType }) {
  const config = nodeConfig[type]
  const Icon = config.icon
  const nodeData = data as unknown as NodeData

  return (
    <div
      className={cn(
        'px-4 py-3 rounded-xl border-2 min-w-[160px] max-w-[240px] transition-all',
        config.bgColor,
        selected && 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-gray-900',
        nodeData.status && statusStyles[nodeData.status]
      )}
    >
      {type !== 'start' && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-gray-400 dark:!bg-gray-500 !border-2 !border-white dark:!border-gray-800"
        />
      )}

      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg bg-white dark:bg-gray-800', config.color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
            {nodeData.label}
          </div>
          {nodeData.description && (
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
              {nodeData.description}
            </div>
          )}
        </div>
      </div>

      {type !== 'end' && type !== 'condition' && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-gray-400 dark:!bg-gray-500 !border-2 !border-white dark:!border-gray-800"
        />
      )}

      {/* Condition node has two outputs */}
      {type === 'condition' && (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            className="!w-3 !h-3 !bg-green-500 !border-2 !border-white dark:!border-gray-800 !left-[30%]"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="!w-3 !h-3 !bg-red-500 !border-2 !border-white dark:!border-gray-800 !left-[70%]"
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-2">
            <span>True</span>
            <span>False</span>
          </div>
        </>
      )}
    </div>
  )
}

export const StartNode = memo((props: NodeProps) => (
  <BaseNode {...props} type="start" />
))
StartNode.displayName = 'StartNode'

export const EndNode = memo((props: NodeProps) => (
  <BaseNode {...props} type="end" />
))
EndNode.displayName = 'EndNode'

export const ActionNode = memo((props: NodeProps) => (
  <BaseNode {...props} type="action" />
))
ActionNode.displayName = 'ActionNode'

export const MutationNode = memo((props: NodeProps) => (
  <BaseNode {...props} type="mutation" />
))
MutationNode.displayName = 'MutationNode'

export const QueryNode = memo((props: NodeProps) => (
  <BaseNode {...props} type="query" />
))
QueryNode.displayName = 'QueryNode'

export const ConditionNode = memo((props: NodeProps) => (
  <BaseNode {...props} type="condition" />
))
ConditionNode.displayName = 'ConditionNode'

export const DelayNode = memo((props: NodeProps) => (
  <BaseNode {...props} type="delay" />
))
DelayNode.displayName = 'DelayNode'

export const ParallelNode = memo((props: NodeProps) => (
  <BaseNode {...props} type="parallel" />
))
ParallelNode.displayName = 'ParallelNode'

export const LoopNode = memo((props: NodeProps) => (
  <BaseNode {...props} type="loop" />
))
LoopNode.displayName = 'LoopNode'

export const AINode = memo((props: NodeProps) => (
  <BaseNode {...props} type="ai" />
))
AINode.displayName = 'AINode'

export const nodeTypes = {
  start: StartNode,
  end: EndNode,
  action: ActionNode,
  mutation: MutationNode,
  query: QueryNode,
  condition: ConditionNode,
  delay: DelayNode,
  parallel: ParallelNode,
  loop: LoopNode,
  ai: AINode,
}
