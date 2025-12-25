import { useParams } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { WorkflowCanvas } from '../components/WorkflowCanvas'
import { Loader2 } from 'lucide-react'
import type { Id } from '../../convex/_generated/dataModel'

export function WorkflowEditor() {
  const { workflowId } = useParams({ from: '/workflow/$workflowId' })
  const workflow = useQuery(api.workflows.get, {
    id: workflowId as Id<'workflows'>,
  })

  if (workflow === undefined) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (workflow === null) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Workflow not found
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            The workflow you're looking for doesn't exist.
          </p>
        </div>
      </div>
    )
  }

  return (
    <WorkflowCanvas
      workflowId={workflowId as Id<'workflows'>}
      workflow={workflow}
    />
  )
}
