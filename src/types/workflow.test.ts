import { describe, it, expect } from 'vitest'
import type {
  NodeType,
  ExecutionStatus,
  StepStatus,
  WorkflowNode,
  WorkflowEdge,
  Workflow,
  ActionNodeConfig,
  ConditionNodeConfig,
  DelayNodeConfig,
  ParallelNodeConfig,
  LoopNodeConfig,
  AINodeConfig,
  StepTemplate,
} from './workflow'

describe('Workflow Types', () => {
  describe('NodeType', () => {
    it('should support all expected node types', () => {
      const nodeTypes: NodeType[] = [
        'start',
        'end',
        'action',
        'mutation',
        'query',
        'condition',
        'delay',
        'parallel',
        'loop',
        'ai',
      ]
      expect(nodeTypes).toHaveLength(10)
    })
  })

  describe('ExecutionStatus', () => {
    it('should support all expected execution statuses', () => {
      const statuses: ExecutionStatus[] = [
        'pending',
        'running',
        'completed',
        'failed',
        'cancelled',
      ]
      expect(statuses).toHaveLength(5)
    })
  })

  describe('StepStatus', () => {
    it('should support all expected step statuses', () => {
      const statuses: StepStatus[] = [
        'pending',
        'running',
        'completed',
        'failed',
        'skipped',
      ]
      expect(statuses).toHaveLength(5)
    })
  })

  describe('WorkflowNode', () => {
    it('should create a valid workflow node', () => {
      const node: WorkflowNode = {
        id: 'node-1',
        type: 'action',
        position: { x: 100, y: 200 },
        data: {
          label: 'My Action',
          description: 'A test action',
          config: {
            actionType: 'http',
            url: 'https://api.example.com',
            method: 'GET',
          } as ActionNodeConfig,
        },
      }

      expect(node.id).toBe('node-1')
      expect(node.type).toBe('action')
      expect(node.position.x).toBe(100)
      expect(node.position.y).toBe(200)
      expect(node.data.label).toBe('My Action')
    })
  })

  describe('WorkflowEdge', () => {
    it('should create a valid workflow edge', () => {
      const edge: WorkflowEdge = {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
        label: 'On Success',
        animated: true,
      }

      expect(edge.id).toBe('edge-1')
      expect(edge.source).toBe('node-1')
      expect(edge.target).toBe('node-2')
      expect(edge.label).toBe('On Success')
      expect(edge.animated).toBe(true)
    })
  })

  describe('Workflow', () => {
    it('should create a valid workflow definition', () => {
      const workflow: Workflow = {
        _id: 'workflow-1',
        name: 'Test Workflow',
        description: 'A test workflow',
        nodes: [
          {
            id: 'start-1',
            type: 'start',
            position: { x: 0, y: 0 },
            data: { label: 'Start', config: {} },
          },
          {
            id: 'end-1',
            type: 'end',
            position: { x: 200, y: 0 },
            data: { label: 'End', config: {} },
          },
        ],
        edges: [
          { id: 'edge-1', source: 'start-1', target: 'end-1' },
        ],
        status: 'draft',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      expect(workflow._id).toBe('workflow-1')
      expect(workflow.name).toBe('Test Workflow')
      expect(workflow.nodes).toHaveLength(2)
      expect(workflow.edges).toHaveLength(1)
      expect(workflow.status).toBe('draft')
    })
  })

  describe('Node Config Types', () => {
    it('should create valid ActionNodeConfig', () => {
      const config: ActionNodeConfig = {
        actionType: 'http',
        url: 'https://api.example.com/data',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"key": "value"}',
        retryEnabled: true,
        retryConfig: {
          maxAttempts: 3,
          initialBackoffMs: 1000,
          base: 2,
        },
      }

      expect(config.actionType).toBe('http')
      expect(config.method).toBe('POST')
      expect(config.retryEnabled).toBe(true)
    })

    it('should create valid ConditionNodeConfig', () => {
      const config: ConditionNodeConfig = {
        conditionType: 'compare',
        left: '{{step1.output.status}}',
        operator: '==',
        right: '200',
      }

      expect(config.conditionType).toBe('compare')
      expect(config.operator).toBe('==')
    })

    it('should create valid DelayNodeConfig', () => {
      const config: DelayNodeConfig = {
        delayType: 'duration',
        durationMs: 5000,
      }

      expect(config.delayType).toBe('duration')
      expect(config.durationMs).toBe(5000)
    })

    it('should create valid ParallelNodeConfig', () => {
      const config: ParallelNodeConfig = {
        branches: ['node-a', 'node-b', 'node-c'],
        waitForAll: true,
      }

      expect(config.branches).toHaveLength(3)
      expect(config.waitForAll).toBe(true)
    })

    it('should create valid LoopNodeConfig', () => {
      const config: LoopNodeConfig = {
        iterateOver: '{{data.items}}',
        itemVariable: 'item',
        indexVariable: 'idx',
      }

      expect(config.iterateOver).toBe('{{data.items}}')
      expect(config.itemVariable).toBe('item')
    })

    it('should create valid AINodeConfig', () => {
      const config: AINodeConfig = {
        model: 'claude-3',
        prompt: 'Summarize the following: {{input.text}}',
        systemPrompt: 'You are a helpful assistant.',
        temperature: 0.7,
        maxTokens: 500,
        outputVariable: 'summary',
      }

      expect(config.model).toBe('claude-3')
      expect(config.temperature).toBe(0.7)
    })
  })

  describe('StepTemplate', () => {
    it('should create a valid step template', () => {
      const template: StepTemplate = {
        _id: 'template-1',
        name: 'HTTP Request',
        description: 'Make an HTTP request',
        type: 'action',
        icon: 'globe',
        category: 'integration',
        configSchema: {
          url: { type: 'string', required: true },
          method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'] },
        },
        defaultConfig: {
          actionType: 'http',
          method: 'GET',
        } as ActionNodeConfig,
        color: '#3B82F6',
      }

      expect(template._id).toBe('template-1')
      expect(template.type).toBe('action')
      expect(template.category).toBe('integration')
    })
  })
})
