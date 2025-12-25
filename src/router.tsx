import { createRouter, createRoute, createRootRoute } from '@tanstack/react-router'
import { Layout } from './components/Layout'
import { WorkflowList } from './components/WorkflowList'
import { WorkflowEditor } from './pages/WorkflowEditor'
import { ExecutionList } from './components/ExecutionList'

// Root route with layout
const rootRoute = createRootRoute({
  component: Layout,
})

// Index route - Workflow list
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: WorkflowList,
})

// Workflow editor route
const workflowRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/workflow/$workflowId',
  component: WorkflowEditor,
})

// Executions route
const executionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/executions',
  component: ExecutionList,
})

// Create route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  workflowRoute,
  executionsRoute,
])

// Create router
export const router = createRouter({ routeTree })

// Type declarations
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
