import { useState } from 'react'
import { X, Save, Trash2 } from 'lucide-react'
import { cn } from '../lib/utils'
import type { NodeType, ActionNodeConfig, ConditionNodeConfig, DelayNodeConfig, AINodeConfig } from '../types/workflow'

interface ConfigPanelProps {
  node: {
    id: string
    type: NodeType
    data: {
      label: string
      description?: string
      config: Record<string, unknown>
    }
  } | null
  onUpdate: (nodeId: string, data: { label: string; description?: string; config: Record<string, unknown> }) => void
  onDelete: (nodeId: string) => void
  onClose: () => void
}

export function ConfigPanel({ node, onUpdate, onDelete, onClose }: ConfigPanelProps) {
  // Use node.id as key to reset state when node changes
  const [label, setLabel] = useState(node?.data.label ?? '')
  const [description, setDescription] = useState(node?.data.description ?? '')
  const [config, setConfig] = useState<Record<string, unknown>>(node?.data.config ?? {})

  if (!node) return null

  const handleSave = () => {
    onUpdate(node.id, { label, description, config })
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this node?')) {
      onDelete(node.id)
    }
  }

  const updateConfig = (key: string, value: unknown) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  const renderConfigFields = () => {
    switch (node.type) {
      case 'action':
        return <ActionConfigFields config={config as unknown as Partial<ActionNodeConfig>} updateConfig={updateConfig} />
      case 'condition':
        return <ConditionConfigFields config={config as unknown as Partial<ConditionNodeConfig>} updateConfig={updateConfig} />
      case 'delay':
        return <DelayConfigFields config={config as unknown as Partial<DelayNodeConfig>} updateConfig={updateConfig} />
      case 'ai':
        return <AIConfigFields config={config as unknown as Partial<AINodeConfig>} updateConfig={updateConfig} />
      case 'query':
      case 'mutation':
        return <FunctionConfigFields config={config} updateConfig={updateConfig} />
      case 'loop':
        return <LoopConfigFields config={config} updateConfig={updateConfig} />
      default:
        return null
    }
  }

  const isStartOrEnd = node.type === 'start' || node.type === 'end'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="font-semibold text-gray-900 dark:text-white">
          Configure Node
        </h2>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-4 space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
        {/* Basic info */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Label
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none"
          />
        </div>

        {/* Type-specific config */}
        {renderConfigFields()}
      </div>

      <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        {!isStartOrEnd && (
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        )}
        <button
          onClick={handleSave}
          className={cn(
            'flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm',
            isStartOrEnd && 'ml-auto'
          )}
        >
          <Save className="h-4 w-4" />
          Save
        </button>
      </div>
    </div>
  )
}

// Config field components
function ActionConfigFields({ config, updateConfig }: { config: Partial<ActionNodeConfig>; updateConfig: (k: string, v: unknown) => void }) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          HTTP Method
        </label>
        <select
          value={config.method || 'GET'}
          onChange={(e) => updateConfig('method', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          URL
        </label>
        <input
          type="text"
          value={config.url || ''}
          onChange={(e) => updateConfig('url', e.target.value)}
          placeholder="https://api.example.com/endpoint"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Request Body (JSON)
        </label>
        <textarea
          value={config.body || ''}
          onChange={(e) => updateConfig('body', e.target.value)}
          rows={3}
          placeholder='{"key": "value"}'
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-mono resize-none"
        />
      </div>
    </>
  )
}

function ConditionConfigFields({ config, updateConfig }: { config: Partial<ConditionNodeConfig>; updateConfig: (k: string, v: unknown) => void }) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Left Value
        </label>
        <input
          type="text"
          value={config.left || ''}
          onChange={(e) => updateConfig('left', e.target.value)}
          placeholder="{{previousStep.output}}"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-mono"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Operator
        </label>
        <select
          value={config.operator || '=='}
          onChange={(e) => updateConfig('operator', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
        >
          <option value="==">equals (==)</option>
          <option value="!=">not equals (!=)</option>
          <option value=">">&gt; greater than</option>
          <option value="<">&lt; less than</option>
          <option value=">=">&gt;= greater or equal</option>
          <option value="<=">&lt;= less or equal</option>
          <option value="contains">contains</option>
          <option value="startsWith">starts with</option>
          <option value="endsWith">ends with</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Right Value
        </label>
        <input
          type="text"
          value={config.right || ''}
          onChange={(e) => updateConfig('right', e.target.value)}
          placeholder="expectedValue"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-mono"
        />
      </div>
    </>
  )
}

function DelayConfigFields({ config, updateConfig }: { config: Partial<DelayNodeConfig>; updateConfig: (k: string, v: unknown) => void }) {
  const durationSeconds = Math.floor((config.durationMs || 0) / 1000)

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Delay Duration (seconds)
      </label>
      <input
        type="number"
        min="0"
        value={durationSeconds}
        onChange={(e) => updateConfig('durationMs', parseInt(e.target.value) * 1000)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
      />
    </div>
  )
}

function AIConfigFields({ config, updateConfig }: { config: Partial<AINodeConfig>; updateConfig: (k: string, v: unknown) => void }) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Model
        </label>
        <select
          value={config.model || 'gpt-4'}
          onChange={(e) => updateConfig('model', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
        >
          <option value="gpt-4">GPT-4</option>
          <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          <option value="claude-3">Claude 3</option>
          <option value="claude-2">Claude 2</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          System Prompt
        </label>
        <textarea
          value={config.systemPrompt || ''}
          onChange={(e) => updateConfig('systemPrompt', e.target.value)}
          rows={2}
          placeholder="You are a helpful assistant..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Prompt
        </label>
        <textarea
          value={config.prompt || ''}
          onChange={(e) => updateConfig('prompt', e.target.value)}
          rows={3}
          placeholder="Process this input: {{input}}"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Temperature: {config.temperature ?? 0.7}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={config.temperature ?? 0.7}
          onChange={(e) => updateConfig('temperature', parseFloat(e.target.value))}
          className="w-full"
        />
      </div>
    </>
  )
}

function FunctionConfigFields({ config, updateConfig }: { config: Record<string, unknown>; updateConfig: (k: string, v: unknown) => void }) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Function Path
        </label>
        <input
          type="text"
          value={(config.functionPath as string) || ''}
          onChange={(e) => updateConfig('functionPath', e.target.value)}
          placeholder="api.myModule.myFunction"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-mono"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Arguments (JSON)
        </label>
        <textarea
          value={typeof config.args === 'object' ? JSON.stringify(config.args, null, 2) : '{}'}
          onChange={(e) => {
            try {
              updateConfig('args', JSON.parse(e.target.value))
            } catch {
              // Invalid JSON, ignore
            }
          }}
          rows={3}
          placeholder='{"arg1": "value1"}'
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-mono resize-none"
        />
      </div>
    </>
  )
}

function LoopConfigFields({ config, updateConfig }: { config: Record<string, unknown>; updateConfig: (k: string, v: unknown) => void }) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Iterate Over
        </label>
        <input
          type="text"
          value={(config.iterateOver as string) || ''}
          onChange={(e) => updateConfig('iterateOver', e.target.value)}
          placeholder="{{previousStep.items}}"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-mono"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Item Variable Name
        </label>
        <input
          type="text"
          value={(config.itemVariable as string) || 'item'}
          onChange={(e) => updateConfig('itemVariable', e.target.value)}
          placeholder="item"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-mono"
        />
      </div>
    </>
  )
}
