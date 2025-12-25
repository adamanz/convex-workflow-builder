// Core workflow types for the workflow builder

export type NodeType =
  | 'start'
  | 'end'
  | 'action'
  | 'mutation'
  | 'query'
  | 'condition'
  | 'delay'
  | 'parallel'
  | 'loop'
  | 'ai';

export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type StepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

export interface Position {
  x: number;
  y: number;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: Position;
  data: {
    label: string;
    description?: string;
    icon?: string;
    config: NodeConfig;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  animated?: boolean;
}

// Node configuration types
export interface BaseNodeConfig {
  retryEnabled?: boolean;
  retryConfig?: {
    maxAttempts: number;
    initialBackoffMs: number;
    base: number;
  };
  timeout?: number;
}

export interface ActionNodeConfig extends BaseNodeConfig {
  actionType: 'http' | 'custom' | 'internal';
  // HTTP action config
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string;
  // Internal action config
  functionPath?: string;
  args?: Record<string, unknown>;
}

export interface ConditionNodeConfig extends BaseNodeConfig {
  conditionType: 'expression' | 'compare';
  expression?: string;
  left?: string;
  operator?: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'startsWith' | 'endsWith';
  right?: string;
}

export interface DelayNodeConfig extends BaseNodeConfig {
  delayType: 'duration' | 'until';
  durationMs?: number;
  untilTimestamp?: number;
}

export interface ParallelNodeConfig extends BaseNodeConfig {
  branches: string[]; // Node IDs to run in parallel
  waitForAll?: boolean;
}

export interface LoopNodeConfig extends BaseNodeConfig {
  iterateOver: string; // Variable path to array
  itemVariable: string; // Variable name for current item
  indexVariable?: string; // Variable name for current index
}

export interface AINodeConfig extends BaseNodeConfig {
  model: 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3' | 'claude-2';
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  outputVariable?: string;
}

export type NodeConfig =
  | ActionNodeConfig
  | ConditionNodeConfig
  | DelayNodeConfig
  | ParallelNodeConfig
  | LoopNodeConfig
  | AINodeConfig
  | BaseNodeConfig;

// Workflow definition
export interface Workflow {
  _id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  status: 'draft' | 'published' | 'archived';
  variables?: Record<string, VariableDefinition>;
  createdAt: number;
  updatedAt: number;
}

export interface VariableDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  defaultValue?: unknown;
  required?: boolean;
  description?: string;
}

// Execution types
export interface WorkflowExecution {
  _id: string;
  workflowId: string;
  convexWorkflowId: string;
  status: ExecutionStatus;
  input: Record<string, unknown>;
  output?: unknown;
  error?: string;
  startedAt: number;
  completedAt?: number;
  currentStep?: string;
  stepResults: StepResult[];
}

export interface StepResult {
  nodeId: string;
  nodeName: string;
  status: StepStatus;
  input?: unknown;
  output?: unknown;
  error?: string;
  startedAt: number;
  completedAt?: number;
  duration?: number;
  retryCount?: number;
}

export interface ExecutionLog {
  _id: string;
  executionId: string;
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  nodeId?: string;
  data?: unknown;
}

// Step template for the palette
export interface StepTemplate {
  _id: string;
  name: string;
  description: string;
  type: NodeType;
  icon: string;
  category: 'core' | 'data' | 'logic' | 'integration' | 'ai';
  configSchema: Record<string, unknown>;
  defaultConfig: NodeConfig;
  color?: string;
}

// Canvas state
export interface CanvasState {
  zoom: number;
  position: Position;
  selectedNodes: string[];
  selectedEdges: string[];
}

// Drag and drop
export interface DragItem {
  type: 'node';
  template: StepTemplate;
}
