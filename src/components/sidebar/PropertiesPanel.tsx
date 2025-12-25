import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings2,
  Code2,
  Info,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Copy,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type {
  WorkflowNode,
  NodeConfig,
  ActionNodeConfig,
  ConditionNodeConfig,
  DelayNodeConfig,
  AINodeConfig,
} from '@/types/workflow';

interface PropertiesPanelProps {
  selectedNode: WorkflowNode | null;
  onUpdateNode?: (nodeId: string, updates: Partial<WorkflowNode>) => void;
  onDeleteNode?: (nodeId: string) => void;
  onClose?: () => void;
}

interface ValidationError {
  field: string;
  message: string;
}

export function PropertiesPanel({
  selectedNode,
  onUpdateNode,
  onDeleteNode,
  onClose,
}: PropertiesPanelProps) {
  const [activeTab, setActiveTab] = React.useState<'config' | 'advanced' | 'json'>(
    'config'
  );
  const [errors, setErrors] = React.useState<ValidationError[]>([]);
  const [showJsonPreview, setShowJsonPreview] = React.useState(false);

  // Reset tab when node changes
  React.useEffect(() => {
    setActiveTab('config');
    setErrors([]);
  }, [selectedNode?._id]);

  if (!selectedNode) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 mb-4">
          <Settings2 className="h-6 w-6 text-zinc-500" />
        </div>
        <h3 className="text-sm font-medium text-zinc-300 mb-1">No Node Selected</h3>
        <p className="text-xs text-zinc-500 max-w-[200px]">
          Select a node on the canvas to view and edit its properties
        </p>
      </div>
    );
  }

  const handleUpdateConfig = (updates: Partial<NodeConfig>) => {
    if (!selectedNode) return;
    onUpdateNode?.(selectedNode.id, {
      data: {
        ...selectedNode.data,
        config: {
          ...selectedNode.data.config,
          ...updates,
        },
      },
    });
  };

  const handleUpdateData = (updates: Partial<typeof selectedNode.data>) => {
    if (!selectedNode) return;
    onUpdateNode?.(selectedNode.id, {
      data: {
        ...selectedNode.data,
        ...updates,
      },
    });
  };

  const validateConfig = (): boolean => {
    const newErrors: ValidationError[] = [];
    const config = selectedNode.data.config;

    if (selectedNode.type === 'action') {
      const actionConfig = config as ActionNodeConfig;
      if (actionConfig.actionType === 'http' && !actionConfig.url) {
        newErrors.push({ field: 'url', message: 'URL is required' });
      }
      if (actionConfig.actionType === 'internal' && !actionConfig.functionPath) {
        newErrors.push({ field: 'functionPath', message: 'Function path is required' });
      }
    }

    if (selectedNode.type === 'condition') {
      const conditionConfig = config as ConditionNodeConfig;
      if (conditionConfig.conditionType === 'expression' && !conditionConfig.expression) {
        newErrors.push({ field: 'expression', message: 'Expression is required' });
      }
    }

    if (selectedNode.type === 'ai') {
      const aiConfig = config as AINodeConfig;
      if (!aiConfig.prompt) {
        newErrors.push({ field: 'prompt', message: 'Prompt is required' });
      }
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const getErrorForField = (field: string): string | undefined => {
    return errors.find((e) => e.field === field)?.message;
  };

  const tabs = [
    { id: 'config' as const, label: 'Config', icon: Settings2 },
    { id: 'advanced' as const, label: 'Advanced', icon: Code2 },
    { id: 'json' as const, label: 'JSON', icon: Code2 },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
            style={{
              backgroundColor: getNodeColor(selectedNode.type) + '20',
            }}
          >
            <NodeIcon type={selectedNode.type} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-zinc-200 truncate">
              {selectedNode.data.label}
            </h3>
            <p className="text-xs text-zinc-500 capitalize">{selectedNode.type}</p>
          </div>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7 text-zinc-500 hover:text-zinc-300"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors',
              activeTab === tab.id
                ? 'text-zinc-200 border-b-2 border-primary'
                : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="p-4"
          >
            {activeTab === 'config' && (
              <ConfigPanel
                node={selectedNode}
                onUpdateConfig={handleUpdateConfig}
                onUpdateData={handleUpdateData}
                getErrorForField={getErrorForField}
              />
            )}
            {activeTab === 'advanced' && (
              <AdvancedPanel
                node={selectedNode}
                onUpdateConfig={handleUpdateConfig}
              />
            )}
            {activeTab === 'json' && (
              <JsonPreviewPanel node={selectedNode} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Validation Errors */}
      {errors.length > 0 && (
        <div className="px-4 py-2 border-t border-zinc-800 bg-destructive/10">
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{errors.length} validation error(s)</span>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-zinc-800 bg-zinc-950/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDeleteNode?.(selectedNode.id)}
          className="text-zinc-500 hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-500"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          <Button
            size="sm"
            onClick={validateConfig}
            className="bg-primary hover:bg-primary/90"
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}

// Config Panel Component
interface ConfigPanelProps {
  node: WorkflowNode;
  onUpdateConfig: (updates: Partial<NodeConfig>) => void;
  onUpdateData: (updates: Partial<WorkflowNode['data']>) => void;
  getErrorForField: (field: string) => string | undefined;
}

function ConfigPanel({
  node,
  onUpdateConfig,
  onUpdateData,
  getErrorForField,
}: ConfigPanelProps) {
  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <FormSection title="Basic Info">
        <FormField label="Label" error={getErrorForField('label')}>
          <Input
            value={node.data.label}
            onChange={(e) => onUpdateData({ label: e.target.value })}
            className="bg-zinc-900 border-zinc-700 text-zinc-100"
            placeholder="Node label"
          />
        </FormField>
        <FormField label="Description">
          <Input
            value={node.data.description || ''}
            onChange={(e) => onUpdateData({ description: e.target.value })}
            className="bg-zinc-900 border-zinc-700 text-zinc-100"
            placeholder="Optional description"
          />
        </FormField>
      </FormSection>

      {/* Type-specific config */}
      {node.type === 'action' && (
        <ActionConfig
          config={node.data.config as ActionNodeConfig}
          onUpdate={onUpdateConfig}
          getErrorForField={getErrorForField}
        />
      )}
      {node.type === 'condition' && (
        <ConditionConfig
          config={node.data.config as ConditionNodeConfig}
          onUpdate={onUpdateConfig}
          getErrorForField={getErrorForField}
        />
      )}
      {node.type === 'delay' && (
        <DelayConfig
          config={node.data.config as DelayNodeConfig}
          onUpdate={onUpdateConfig}
          getErrorForField={getErrorForField}
        />
      )}
      {node.type === 'ai' && (
        <AIConfig
          config={node.data.config as AINodeConfig}
          onUpdate={onUpdateConfig}
          getErrorForField={getErrorForField}
        />
      )}
    </div>
  );
}

// Action Config
function ActionConfig({
  config,
  onUpdate,
  getErrorForField,
}: {
  config: ActionNodeConfig;
  onUpdate: (updates: Partial<ActionNodeConfig>) => void;
  getErrorForField: (field: string) => string | undefined;
}) {
  return (
    <FormSection title="Action Configuration">
      <FormField label="Action Type">
        <select
          value={config.actionType}
          onChange={(e) =>
            onUpdate({ actionType: e.target.value as ActionNodeConfig['actionType'] })
          }
          className="w-full h-9 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
        >
          <option value="http">HTTP Request</option>
          <option value="internal">Internal Function</option>
          <option value="custom">Custom</option>
        </select>
      </FormField>

      {config.actionType === 'http' && (
        <>
          <FormField label="URL" error={getErrorForField('url')}>
            <Input
              value={config.url || ''}
              onChange={(e) => onUpdate({ url: e.target.value })}
              className="bg-zinc-900 border-zinc-700 text-zinc-100"
              placeholder="https://api.example.com/endpoint"
            />
          </FormField>
          <FormField label="Method">
            <select
              value={config.method || 'GET'}
              onChange={(e) =>
                onUpdate({ method: e.target.value as ActionNodeConfig['method'] })
              }
              className="w-full h-9 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
          </FormField>
          <FormField label="Request Body">
            <CodeEditor
              value={config.body || ''}
              onChange={(value) => onUpdate({ body: value })}
              language="json"
              placeholder='{"key": "value"}'
            />
          </FormField>
        </>
      )}

      {config.actionType === 'internal' && (
        <FormField label="Function Path" error={getErrorForField('functionPath')}>
          <Input
            value={config.functionPath || ''}
            onChange={(e) => onUpdate({ functionPath: e.target.value })}
            className="bg-zinc-900 border-zinc-700 text-zinc-100 font-mono text-sm"
            placeholder="api:myFunction"
          />
        </FormField>
      )}
    </FormSection>
  );
}

// Condition Config
function ConditionConfig({
  config,
  onUpdate,
  getErrorForField,
}: {
  config: ConditionNodeConfig;
  onUpdate: (updates: Partial<ConditionNodeConfig>) => void;
  getErrorForField: (field: string) => string | undefined;
}) {
  return (
    <FormSection title="Condition Configuration">
      <FormField label="Condition Type">
        <select
          value={config.conditionType}
          onChange={(e) =>
            onUpdate({
              conditionType: e.target.value as ConditionNodeConfig['conditionType'],
            })
          }
          className="w-full h-9 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
        >
          <option value="expression">Expression</option>
          <option value="compare">Compare Values</option>
        </select>
      </FormField>

      {config.conditionType === 'expression' && (
        <FormField label="Expression" error={getErrorForField('expression')}>
          <CodeEditor
            value={config.expression || ''}
            onChange={(value) => onUpdate({ expression: value })}
            language="javascript"
            placeholder="input.value > 10"
          />
        </FormField>
      )}

      {config.conditionType === 'compare' && (
        <>
          <FormField label="Left Value">
            <Input
              value={config.left || ''}
              onChange={(e) => onUpdate({ left: e.target.value })}
              className="bg-zinc-900 border-zinc-700 text-zinc-100 font-mono text-sm"
              placeholder="{{input.value}}"
            />
          </FormField>
          <FormField label="Operator">
            <select
              value={config.operator || '=='}
              onChange={(e) =>
                onUpdate({
                  operator: e.target.value as ConditionNodeConfig['operator'],
                })
              }
              className="w-full h-9 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
            >
              <option value="==">Equals (==)</option>
              <option value="!=">Not Equals (!=)</option>
              <option value=">">Greater Than (&gt;)</option>
              <option value="<">Less Than (&lt;)</option>
              <option value=">=">Greater or Equal (&gt;=)</option>
              <option value="<=">Less or Equal (&lt;=)</option>
              <option value="contains">Contains</option>
              <option value="startsWith">Starts With</option>
              <option value="endsWith">Ends With</option>
            </select>
          </FormField>
          <FormField label="Right Value">
            <Input
              value={config.right || ''}
              onChange={(e) => onUpdate({ right: e.target.value })}
              className="bg-zinc-900 border-zinc-700 text-zinc-100 font-mono text-sm"
              placeholder="10"
            />
          </FormField>
        </>
      )}
    </FormSection>
  );
}

// Delay Config
function DelayConfig({
  config,
  onUpdate,
  getErrorForField,
}: {
  config: DelayNodeConfig;
  onUpdate: (updates: Partial<DelayNodeConfig>) => void;
  getErrorForField: (field: string) => string | undefined;
}) {
  return (
    <FormSection title="Delay Configuration">
      <FormField label="Delay Type">
        <select
          value={config.delayType}
          onChange={(e) =>
            onUpdate({ delayType: e.target.value as DelayNodeConfig['delayType'] })
          }
          className="w-full h-9 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
        >
          <option value="duration">Duration</option>
          <option value="until">Until Timestamp</option>
        </select>
      </FormField>

      {config.delayType === 'duration' && (
        <FormField label="Duration (ms)">
          <Input
            type="number"
            value={config.durationMs || 0}
            onChange={(e) => onUpdate({ durationMs: parseInt(e.target.value) || 0 })}
            className="bg-zinc-900 border-zinc-700 text-zinc-100"
            placeholder="1000"
            min={0}
          />
        </FormField>
      )}
    </FormSection>
  );
}

// AI Config
function AIConfig({
  config,
  onUpdate,
  getErrorForField,
}: {
  config: AINodeConfig;
  onUpdate: (updates: Partial<AINodeConfig>) => void;
  getErrorForField: (field: string) => string | undefined;
}) {
  return (
    <FormSection title="AI Configuration">
      <FormField label="Model">
        <select
          value={config.model}
          onChange={(e) => onUpdate({ model: e.target.value as AINodeConfig['model'] })}
          className="w-full h-9 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
        >
          <option value="gpt-4">GPT-4</option>
          <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          <option value="claude-3">Claude 3</option>
          <option value="claude-2">Claude 2</option>
        </select>
      </FormField>

      <FormField label="System Prompt">
        <CodeEditor
          value={config.systemPrompt || ''}
          onChange={(value) => onUpdate({ systemPrompt: value })}
          language="text"
          placeholder="You are a helpful assistant..."
          rows={3}
        />
      </FormField>

      <FormField label="Prompt" error={getErrorForField('prompt')}>
        <CodeEditor
          value={config.prompt}
          onChange={(value) => onUpdate({ prompt: value })}
          language="text"
          placeholder="Enter your prompt here..."
          rows={5}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Temperature">
          <Input
            type="number"
            value={config.temperature || 0.7}
            onChange={(e) => onUpdate({ temperature: parseFloat(e.target.value) || 0.7 })}
            className="bg-zinc-900 border-zinc-700 text-zinc-100"
            step={0.1}
            min={0}
            max={2}
          />
        </FormField>
        <FormField label="Max Tokens">
          <Input
            type="number"
            value={config.maxTokens || 1024}
            onChange={(e) => onUpdate({ maxTokens: parseInt(e.target.value) || 1024 })}
            className="bg-zinc-900 border-zinc-700 text-zinc-100"
            min={1}
            max={128000}
          />
        </FormField>
      </div>

      <FormField label="Output Variable">
        <Input
          value={config.outputVariable || ''}
          onChange={(e) => onUpdate({ outputVariable: e.target.value })}
          className="bg-zinc-900 border-zinc-700 text-zinc-100 font-mono text-sm"
          placeholder="aiResponse"
        />
      </FormField>
    </FormSection>
  );
}

// Advanced Panel
function AdvancedPanel({
  node,
  onUpdateConfig,
}: {
  node: WorkflowNode;
  onUpdateConfig: (updates: Partial<NodeConfig>) => void;
}) {
  const config = node.data.config;

  return (
    <div className="space-y-4">
      <FormSection title="Retry Configuration">
        <FormField label="Enable Retry">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={config.retryEnabled || false}
              onChange={(e) => onUpdateConfig({ retryEnabled: e.target.checked })}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-primary focus:ring-primary"
            />
            <span className="text-sm text-zinc-400">
              Retry on failure
            </span>
          </div>
        </FormField>

        {config.retryEnabled && (
          <>
            <FormField label="Max Attempts">
              <Input
                type="number"
                value={config.retryConfig?.maxAttempts || 3}
                onChange={(e) =>
                  onUpdateConfig({
                    retryConfig: {
                      ...config.retryConfig,
                      maxAttempts: parseInt(e.target.value) || 3,
                      initialBackoffMs: config.retryConfig?.initialBackoffMs || 1000,
                      base: config.retryConfig?.base || 2,
                    },
                  })
                }
                className="bg-zinc-900 border-zinc-700 text-zinc-100"
                min={1}
                max={10}
              />
            </FormField>
            <FormField label="Initial Backoff (ms)">
              <Input
                type="number"
                value={config.retryConfig?.initialBackoffMs || 1000}
                onChange={(e) =>
                  onUpdateConfig({
                    retryConfig: {
                      ...config.retryConfig,
                      maxAttempts: config.retryConfig?.maxAttempts || 3,
                      initialBackoffMs: parseInt(e.target.value) || 1000,
                      base: config.retryConfig?.base || 2,
                    },
                  })
                }
                className="bg-zinc-900 border-zinc-700 text-zinc-100"
                min={100}
              />
            </FormField>
          </>
        )}
      </FormSection>

      <FormSection title="Timeout">
        <FormField label="Timeout (ms)">
          <Input
            type="number"
            value={config.timeout || ''}
            onChange={(e) =>
              onUpdateConfig({ timeout: parseInt(e.target.value) || undefined })
            }
            className="bg-zinc-900 border-zinc-700 text-zinc-100"
            placeholder="No timeout"
            min={100}
          />
        </FormField>
      </FormSection>
    </div>
  );
}

// JSON Preview Panel
function JsonPreviewPanel({ node }: { node: WorkflowNode }) {
  const jsonString = JSON.stringify(node.data.config, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-300">Node Configuration</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 text-xs text-zinc-500 hover:text-zinc-300"
        >
          <Copy className="h-3.5 w-3.5 mr-1" />
          Copy
        </Button>
      </div>
      <div className="relative">
        <pre className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          <code className="text-xs font-mono text-zinc-300">{jsonString}</code>
        </pre>
      </div>
    </div>
  );
}

// Reusable Form Components
function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [isExpanded, setIsExpanded] = React.useState(true);

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-3 py-2 bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors"
      >
        <span className="text-xs font-medium text-zinc-300 uppercase tracking-wider">
          {title}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-zinc-500 transition-transform',
            !isExpanded && '-rotate-90'
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="p-3 space-y-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-zinc-400">{label}</Label>
      {children}
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

function CodeEditor({
  value,
  onChange,
  language,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (value: string) => void;
  language: string;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          'w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-mono text-zinc-100',
          'placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600',
          'resize-none scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent'
        )}
      />
      <Badge
        variant="secondary"
        className="absolute bottom-2 right-2 text-[10px] px-1.5 py-0 bg-zinc-800 text-zinc-500"
      >
        {language}
      </Badge>
    </div>
  );
}

// Helper functions
function getNodeColor(type: string): string {
  const colors: Record<string, string> = {
    start: '#22c55e',
    end: '#ef4444',
    action: '#3b82f6',
    mutation: '#8b5cf6',
    query: '#06b6d4',
    condition: '#f59e0b',
    delay: '#64748b',
    parallel: '#ec4899',
    loop: '#14b8a6',
    ai: '#a855f7',
  };
  return colors[type] || '#3b82f6';
}

function NodeIcon({ type }: { type: string }) {
  const iconColor = getNodeColor(type);

  // Simple colored circle with type initial for now
  return (
    <div
      className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold"
      style={{ backgroundColor: iconColor, color: 'white' }}
    >
      {type.charAt(0).toUpperCase()}
    </div>
  );
}

export default PropertiesPanel;
