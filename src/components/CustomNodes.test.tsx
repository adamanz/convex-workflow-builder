import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'
import {
  StartNode,
  EndNode,
  ActionNode,
  ConditionNode,
  DelayNode,
  AINode,
} from './CustomNodes'
import { nodeTypes } from './nodeTypes'

// Wrapper component for ReactFlow context
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ReactFlowProvider>{children}</ReactFlowProvider>
}

const baseProps = {
  id: 'test-node',
  type: 'start',
  selected: false,
  isConnectable: true,
  zIndex: 0,
  dragging: false,
  xPos: 0,
  yPos: 0,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
  deletable: true,
  selectable: true,
  parentId: undefined,
  sourcePosition: undefined,
  targetPosition: undefined,
}

describe('CustomNodes', () => {
  describe('StartNode', () => {
    it('renders with correct label', () => {
      render(
        <TestWrapper>
          <StartNode
            {...baseProps}
            data={{ label: 'Start', config: {} }}
          />
        </TestWrapper>
      )
      expect(screen.getByText('Start')).toBeInTheDocument()
    })
  })

  describe('EndNode', () => {
    it('renders with correct label', () => {
      render(
        <TestWrapper>
          <EndNode
            {...baseProps}
            type="end"
            data={{ label: 'End', config: {} }}
          />
        </TestWrapper>
      )
      expect(screen.getByText('End')).toBeInTheDocument()
    })
  })

  describe('ActionNode', () => {
    it('renders with label and description', () => {
      render(
        <TestWrapper>
          <ActionNode
            {...baseProps}
            type="action"
            data={{
              label: 'HTTP Request',
              description: 'Fetch data from API',
              config: { method: 'GET', url: 'https://api.example.com' },
            }}
          />
        </TestWrapper>
      )
      expect(screen.getByText('HTTP Request')).toBeInTheDocument()
      expect(screen.getByText('Fetch data from API')).toBeInTheDocument()
    })
  })

  describe('ConditionNode', () => {
    it('renders with true/false labels', () => {
      render(
        <TestWrapper>
          <ConditionNode
            {...baseProps}
            type="condition"
            data={{ label: 'Check Status', config: {} }}
          />
        </TestWrapper>
      )
      expect(screen.getByText('Check Status')).toBeInTheDocument()
      expect(screen.getByText('True')).toBeInTheDocument()
      expect(screen.getByText('False')).toBeInTheDocument()
    })
  })

  describe('DelayNode', () => {
    it('renders correctly', () => {
      render(
        <TestWrapper>
          <DelayNode
            {...baseProps}
            type="delay"
            data={{ label: 'Wait 5s', config: { durationMs: 5000 } }}
          />
        </TestWrapper>
      )
      expect(screen.getByText('Wait 5s')).toBeInTheDocument()
    })
  })

  describe('AINode', () => {
    it('renders correctly', () => {
      render(
        <TestWrapper>
          <AINode
            {...baseProps}
            type="ai"
            data={{ label: 'Process with AI', config: { model: 'gpt-4' } }}
          />
        </TestWrapper>
      )
      expect(screen.getByText('Process with AI')).toBeInTheDocument()
    })
  })

  describe('nodeTypes', () => {
    it('exports all node types', () => {
      expect(nodeTypes).toHaveProperty('start')
      expect(nodeTypes).toHaveProperty('end')
      expect(nodeTypes).toHaveProperty('action')
      expect(nodeTypes).toHaveProperty('mutation')
      expect(nodeTypes).toHaveProperty('query')
      expect(nodeTypes).toHaveProperty('condition')
      expect(nodeTypes).toHaveProperty('delay')
      expect(nodeTypes).toHaveProperty('parallel')
      expect(nodeTypes).toHaveProperty('loop')
      expect(nodeTypes).toHaveProperty('ai')
    })
  })
})
