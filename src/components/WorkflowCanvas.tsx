import { useCallback, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
} from '@xyflow/react'
import type { Connection, Node, Edge, ReactFlowInstance } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { nodeTypes } from './CustomNodes'
import { NodePalette } from './NodePalette'
import { ConfigPanel } from './ConfigPanel'
import { Save, Play, ArrowLeft } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { generateId } from '../lib/utils'
import type { Id } from '../../convex/_generated/dataModel'
import type { NodeType } from '../types/workflow'

interface WorkflowCanvasProps {
  workflowId: Id<'workflows'>
  workflow: {
    _id: Id<'workflows'>
    name: string
    description?: string
    nodes: Array<{
      id: string
      type: NodeType
      position: { x: number; y: number }
      data: { label: string; description?: string; icon?: string; config: Record<string, unknown> }
    }>
    edges: Array<{
      id: string
      source: string
      target: string
      sourceHandle?: string
      targetHandle?: string
      label?: string
      animated?: boolean
    }>
    status: 'draft' | 'published' | 'archived'
  }
}

export function WorkflowCanvas({ workflowId, workflow }: WorkflowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const initialNodes: Node[] = workflow.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: n.data,
  }))

  const initialEdges: Edge[] = workflow.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    label: e.label,
    animated: e.animated,
  }))

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const updateCanvas = useMutation(api.workflows.updateCanvas)
  const updateNodeConfig = useMutation(api.workflows.updateNodeConfig)
  const startExecution = useMutation(api.executions.start)

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, animated: true }, eds))
    },
    [setEdges]
  )

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()

      if (!reactFlowInstance || !reactFlowWrapper.current) return

      const data = event.dataTransfer.getData('application/reactflow')
      if (!data) return

      const { type, label } = JSON.parse(data) as { type: NodeType; label: string }

      const bounds = reactFlowWrapper.current.getBoundingClientRect()
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      })

      const newNode: Node = {
        id: generateId(),
        type,
        position,
        data: {
          label,
          config: {},
        },
      }

      setNodes((nds) => nds.concat(newNode))
    },
    [reactFlowInstance, setNodes]
  )

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const nodesToSave = nodes.map((n) => ({
        id: n.id,
        type: n.type as NodeType,
        position: n.position,
        data: {
          label: (n.data as { label: string }).label,
          description: (n.data as { description?: string }).description,
          icon: (n.data as { icon?: string }).icon,
          config: (n.data as { config: Record<string, unknown> }).config || {},
        },
      }))

      const edgesToSave = edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        label: e.label as string | undefined,
        animated: e.animated,
      }))

      await updateCanvas({
        id: workflowId,
        nodes: nodesToSave,
        edges: edgesToSave,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateNode = async (
    nodeId: string,
    data: { label: string; description?: string; config: Record<string, unknown> }
  ) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, ...data } }
          : n
      )
    )

    await updateNodeConfig({
      workflowId,
      nodeId,
      data: {
        label: data.label,
        description: data.description,
        config: data.config,
      },
    })

    setSelectedNode(null)
  }

  const handleDeleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId))
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
    setSelectedNode(null)
  }

  const handleRun = async () => {
    await handleSave()
    await startExecution({ workflowId, input: {} })
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-semibold text-gray-900 dark:text-white">
              {workflow.name}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {workflow.status} • {nodes.length} nodes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={handleRun}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Play className="h-4 w-4" />
            Run
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 flex">
        {/* Left sidebar - Node palette */}
        <div className="hidden md:block w-64 p-4 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <NodePalette />
        </div>

        {/* Main canvas */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
            className="bg-gray-50 dark:bg-gray-900"
          >
            <Controls className="!rounded-lg !shadow-md" />
            <MiniMap
              nodeColor={(node) => {
                const colors: Record<string, string> = {
                  start: '#22C55E',
                  end: '#EF4444',
                  action: '#0EA5E9',
                  mutation: '#8B5CF6',
                  query: '#3B82F6',
                  condition: '#F59E0B',
                  delay: '#6366F1',
                  parallel: '#EC4899',
                  loop: '#14B8A6',
                  ai: '#A855F7',
                }
                return colors[node.type || ''] || '#6B7280'
              }}
              className="!rounded-lg !shadow-md"
            />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />

            {/* Mobile palette toggle */}
            <Panel position="top-left" className="md:hidden">
              <NodePalette className="max-w-[200px]" />
            </Panel>
          </ReactFlow>
        </div>

        {/* Right sidebar - Config panel */}
        {selectedNode && (
          <div className="w-80 p-4 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <ConfigPanel
              node={{
                id: selectedNode.id,
                type: selectedNode.type as NodeType,
                data: selectedNode.data as {
                  label: string
                  description?: string
                  config: Record<string, unknown>
                },
              }}
              onUpdate={handleUpdateNode}
              onDelete={handleDeleteNode}
              onClose={() => setSelectedNode(null)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
