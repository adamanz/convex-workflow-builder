import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import {
  Plus,
  GitBranch,
  MoreVertical,
  Copy,
  Trash2,
  Archive,
  Clock,
  CheckCircle,
  FileText
} from 'lucide-react'
import { cn, formatDate } from '../lib/utils'
import type { Id } from '../../convex/_generated/dataModel'
import type { NodeType } from '../types/workflow'

interface Workflow {
  _id: Id<'workflows'>
  name: string
  description?: string
  status: 'draft' | 'published' | 'archived'
  nodes: Array<{ id: string; type: NodeType }>
  updatedAt: number
}

export function WorkflowList() {
  const workflows = useQuery(api.workflows.list, {}) as Workflow[] | undefined
  const createWorkflow = useMutation(api.workflows.create)
  const duplicateWorkflow = useMutation(api.workflows.duplicate)
  const archiveWorkflow = useMutation(api.workflows.archive)
  const deleteWorkflow = useMutation(api.workflows.remove)

  const [isCreating, setIsCreating] = useState(false)
  const [newWorkflowName, setNewWorkflowName] = useState('')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!newWorkflowName.trim()) return
    await createWorkflow({ name: newWorkflowName.trim() })
    setNewWorkflowName('')
    setIsCreating(false)
  }

  const handleDuplicate = async (id: Id<'workflows'>) => {
    await duplicateWorkflow({ id })
    setMenuOpen(null)
  }

  const handleArchive = async (id: Id<'workflows'>) => {
    await archiveWorkflow({ id })
    setMenuOpen(null)
  }

  const handleDelete = async (id: Id<'workflows'>) => {
    if (confirm('Are you sure you want to delete this workflow?')) {
      await deleteWorkflow({ id })
    }
    setMenuOpen(null)
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'archived':
        return <Archive className="h-4 w-4 text-gray-400" />
      default:
        return <FileText className="h-4 w-4 text-yellow-500" />
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Workflows</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Create and manage your automation workflows
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          New Workflow
        </button>
      </div>

      {/* Create workflow modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Create New Workflow
            </h2>
            <input
              type="text"
              value={newWorkflowName}
              onChange={(e) => setNewWorkflowName(e.target.value)}
              placeholder="Workflow name"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newWorkflowName.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workflow list */}
      {workflows === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse bg-white dark:bg-gray-800 rounded-xl p-6 h-40"
            />
          ))}
        </div>
      ) : workflows.length === 0 ? (
        <div className="text-center py-16">
          <GitBranch className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No workflows yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Create your first workflow to get started
          </p>
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Create Workflow
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workflows.map((workflow) => (
            <div
              key={workflow._id}
              className="relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <Link
                to="/workflow/$workflowId"
                params={{ workflowId: workflow._id }}
                className="block"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {statusIcon(workflow.status)}
                    <span className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded-full',
                      workflow.status === 'published'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : workflow.status === 'archived'
                          ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    )}>
                      {workflow.status}
                    </span>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 truncate">
                  {workflow.name}
                </h3>
                {workflow.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                    {workflow.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                  <span className="flex items-center gap-1">
                    <GitBranch className="h-3 w-3" />
                    {workflow.nodes.length} nodes
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(workflow.updatedAt)}
                  </span>
                </div>
              </Link>

              {/* Actions menu */}
              <div className="absolute top-4 right-4">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    setMenuOpen(menuOpen === workflow._id ? null : workflow._id)
                  }}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
                {menuOpen === workflow._id && (
                  <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                    <button
                      onClick={() => handleDuplicate(workflow._id)}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Copy className="h-4 w-4" />
                      Duplicate
                    </button>
                    <button
                      onClick={() => handleArchive(workflow._id)}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Archive className="h-4 w-4" />
                      Archive
                    </button>
                    <button
                      onClick={() => handleDelete(workflow._id)}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
