import type { DragEvent } from 'react'
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
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '../lib/utils'
import type { NodeType } from '../types/workflow'

interface NodeTemplate {
  type: NodeType
  label: string
  description: string
  icon: typeof Play
  color: string
}

interface NodeCategory {
  name: string
  nodes: NodeTemplate[]
}

const categories: NodeCategory[] = [
  {
    name: 'Flow Control',
    nodes: [
      { type: 'start', label: 'Start', description: 'Entry point', icon: Play, color: 'text-green-600' },
      { type: 'end', label: 'End', description: 'Exit point', icon: Square, color: 'text-red-600' },
    ],
  },
  {
    name: 'Data',
    nodes: [
      { type: 'query', label: 'Query', description: 'Read data', icon: Database, color: 'text-blue-600' },
      { type: 'mutation', label: 'Mutation', description: 'Write data', icon: Edit, color: 'text-violet-600' },
    ],
  },
  {
    name: 'Logic',
    nodes: [
      { type: 'condition', label: 'Condition', description: 'Branch logic', icon: GitBranch, color: 'text-amber-600' },
      { type: 'delay', label: 'Delay', description: 'Wait time', icon: Clock, color: 'text-indigo-600' },
      { type: 'parallel', label: 'Parallel', description: 'Concurrent', icon: GitMerge, color: 'text-pink-600' },
      { type: 'loop', label: 'Loop', description: 'Iterate', icon: Repeat, color: 'text-teal-600' },
    ],
  },
  {
    name: 'Integration',
    nodes: [
      { type: 'action', label: 'HTTP', description: 'API call', icon: Globe, color: 'text-sky-600' },
    ],
  },
  {
    name: 'AI',
    nodes: [
      { type: 'ai', label: 'AI Prompt', description: 'LLM call', icon: Sparkles, color: 'text-purple-600' },
    ],
  },
]

interface NodePaletteProps {
  className?: string
}

export function NodePalette({ className }: NodePaletteProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.map((c) => c.name))
  )

  const toggleCategory = (name: string) => {
    const next = new Set(expandedCategories)
    if (next.has(name)) {
      next.delete(name)
    } else {
      next.add(name)
    }
    setExpandedCategories(next)
  }

  const onDragStart = (event: DragEvent, nodeType: NodeType, label: string) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ type: nodeType, label }))
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden', className)}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="font-semibold text-gray-900 dark:text-white">Nodes</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Drag nodes to the canvas
        </p>
      </div>

      <div className="p-2 max-h-[calc(100vh-300px)] overflow-y-auto">
        {categories.map((category) => (
          <div key={category.name} className="mb-2">
            <button
              onClick={() => toggleCategory(category.name)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {expandedCategories.has(category.name) ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              {category.name}
            </button>

            {expandedCategories.has(category.name) && (
              <div className="mt-1 space-y-1 pl-2">
                {category.nodes.map((node) => (
                  <div
                    key={node.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, node.type, node.label)}
                    className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-grab active:cursor-grabbing transition-colors"
                  >
                    <div className={cn('p-1.5 rounded-md bg-white dark:bg-gray-800', node.color)}>
                      <node.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {node.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {node.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
