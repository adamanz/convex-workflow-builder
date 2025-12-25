import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Code2,
  Tag,
  Calendar,
  Globe,
  Lock,
  Upload,
  Download,
  Copy,
  ChevronDown,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { Workflow, VariableDefinition } from '@/types/workflow';

interface WorkflowSettingsProps {
  workflow?: Workflow;
  onUpdate?: (updates: Partial<Workflow>) => void;
  onPublish?: () => void;
  onExport?: () => void;
  onImport?: (file: File) => void;
}

export function WorkflowSettings({
  workflow,
  onUpdate,
  onPublish,
  onExport,
  onImport,
}: WorkflowSettingsProps) {
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(
    new Set(['basic', 'variables', 'publishing'])
  );

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleUpdate = (updates: Partial<Workflow>) => {
    onUpdate?.(updates);
  };

  if (!workflow) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 mb-4">
          <FileText className="h-6 w-6 text-zinc-500" />
        </div>
        <h3 className="text-sm font-medium text-zinc-300 mb-1">No Workflow</h3>
        <p className="text-xs text-zinc-500 max-w-[200px]">
          Create or open a workflow to view its settings
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-zinc-200">Workflow Settings</h3>
              <p className="text-xs text-zinc-500">Configure your workflow</p>
            </div>
          </div>
          <StatusBadge status={workflow.status} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        <div className="p-3 space-y-3">
          {/* Basic Info Section */}
          <SettingsSection
            id="basic"
            title="Basic Information"
            icon={Info}
            isExpanded={expandedSections.has('basic')}
            onToggle={() => toggleSection('basic')}
          >
            <div className="space-y-3">
              <FormField label="Name">
                <Input
                  value={workflow.name}
                  onChange={(e) => handleUpdate({ name: e.target.value })}
                  className="bg-zinc-900 border-zinc-700 text-zinc-100"
                  placeholder="My Workflow"
                />
              </FormField>

              <FormField label="Description">
                <textarea
                  value={workflow.description || ''}
                  onChange={(e) => handleUpdate({ description: e.target.value })}
                  className={cn(
                    'w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100',
                    'placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600',
                    'resize-none scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent'
                  )}
                  rows={3}
                  placeholder="Describe what this workflow does..."
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Created">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {workflow.createdAt
                        ? formatRelativeTime(workflow.createdAt)
                        : 'Unknown'}
                    </span>
                  </div>
                </FormField>
                <FormField label="Updated">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {workflow.updatedAt
                        ? formatRelativeTime(workflow.updatedAt)
                        : 'Unknown'}
                    </span>
                  </div>
                </FormField>
              </div>

              <FormField label="ID">
                <div className="flex items-center gap-2">
                  <Input
                    value={workflow._id}
                    readOnly
                    className="bg-zinc-900 border-zinc-700 text-zinc-500 font-mono text-xs flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-zinc-500 hover:text-zinc-300"
                    onClick={() => navigator.clipboard.writeText(workflow._id)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </FormField>
            </div>
          </SettingsSection>

          {/* Variables Section */}
          <SettingsSection
            id="variables"
            title="Input Variables"
            icon={Code2}
            isExpanded={expandedSections.has('variables')}
            onToggle={() => toggleSection('variables')}
            badge={Object.keys(workflow.variables || {}).length}
          >
            <VariablesEditor
              variables={workflow.variables || {}}
              onChange={(variables) => handleUpdate({ variables })}
            />
          </SettingsSection>

          {/* Publishing Section */}
          <SettingsSection
            id="publishing"
            title="Publishing"
            icon={Globe}
            isExpanded={expandedSections.has('publishing')}
            onToggle={() => toggleSection('publishing')}
          >
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full shrink-0',
                      workflow.status === 'published'
                        ? 'bg-success/20'
                        : 'bg-zinc-800'
                    )}
                  >
                    {workflow.status === 'published' ? (
                      <Globe className="h-4 w-4 text-success" />
                    ) : (
                      <Lock className="h-4 w-4 text-zinc-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-zinc-200">
                      {workflow.status === 'published'
                        ? 'Workflow is Live'
                        : 'Draft Mode'}
                    </h4>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {workflow.status === 'published'
                        ? 'This workflow is deployed and can be triggered'
                        : 'Publish your workflow to make it available for execution'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                {workflow.status !== 'published' ? (
                  <Button
                    onClick={onPublish}
                    className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Publish Workflow
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleUpdate({ status: 'draft' })}
                    variant="outline"
                    className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Unpublish
                  </Button>
                )}
              </div>

              {workflow.status === 'published' && (
                <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                  <div className="flex items-center gap-2 text-success text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Workflow is active and ready</span>
                  </div>
                </div>
              )}
            </div>
          </SettingsSection>

          {/* Import/Export Section */}
          <SettingsSection
            id="import-export"
            title="Import / Export"
            icon={Download}
            isExpanded={expandedSections.has('import-export')}
            onToggle={() => toggleSection('import-export')}
          >
            <div className="space-y-3">
              <p className="text-xs text-zinc-500">
                Export your workflow as JSON or import from a file
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  onClick={onExport}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <label className="flex-1">
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onImport?.(file);
                    }}
                  />
                  <Button
                    variant="outline"
                    className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    asChild
                  >
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Import
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          </SettingsSection>

          {/* Danger Zone */}
          <SettingsSection
            id="danger"
            title="Danger Zone"
            icon={AlertCircle}
            isExpanded={expandedSections.has('danger')}
            onToggle={() => toggleSection('danger')}
            variant="danger"
          >
            <div className="space-y-3">
              <p className="text-xs text-zinc-500">
                Irreversible actions - proceed with caution
              </p>

              <Button
                variant="outline"
                className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
                onClick={() => handleUpdate({ status: 'archived' })}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Archive Workflow
              </Button>
            </div>
          </SettingsSection>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="shrink-0 px-4 py-3 border-t border-zinc-800 bg-zinc-950/80">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>{workflow.nodes?.length || 0} nodes</span>
          <span>{workflow.edges?.length || 0} connections</span>
          <span>
            {Object.keys(workflow.variables || {}).length} variables
          </span>
        </div>
      </div>
    </div>
  );
}

// Settings Section Component
interface SettingsSectionProps {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  isExpanded: boolean;
  onToggle: () => void;
  badge?: number | string;
  variant?: 'default' | 'danger';
  children: React.ReactNode;
}

function SettingsSection({
  id,
  title,
  icon: Icon,
  isExpanded,
  onToggle,
  badge,
  variant = 'default',
  children,
}: SettingsSectionProps) {
  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden',
        variant === 'danger' ? 'border-destructive/30' : 'border-zinc-800'
      )}
    >
      <button
        onClick={onToggle}
        className={cn(
          'flex w-full items-center justify-between px-3 py-2.5 transition-colors',
          variant === 'danger'
            ? 'bg-destructive/10 hover:bg-destructive/20'
            : 'bg-zinc-900/50 hover:bg-zinc-800/50'
        )}
      >
        <div className="flex items-center gap-2">
          <Icon
            className={cn(
              'h-4 w-4',
              variant === 'danger' ? 'text-destructive' : 'text-zinc-500'
            )}
          />
          <span
            className={cn(
              'text-sm font-medium',
              variant === 'danger' ? 'text-destructive' : 'text-zinc-300'
            )}
          >
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {badge !== undefined && (
            <Badge
              variant="secondary"
              className="bg-zinc-800 text-zinc-400 text-xs px-1.5"
            >
              {badge}
            </Badge>
          )}
          <ChevronDown
            className={cn(
              'h-4 w-4 text-zinc-500 transition-transform',
              !isExpanded && '-rotate-90'
            )}
          />
        </div>
      </button>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="p-3 border-t border-zinc-800">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Variables Editor Component
interface VariablesEditorProps {
  variables: Record<string, VariableDefinition>;
  onChange: (variables: Record<string, VariableDefinition>) => void;
}

function VariablesEditor({ variables, onChange }: VariablesEditorProps) {
  const [newVarName, setNewVarName] = React.useState('');

  const handleAddVariable = () => {
    if (!newVarName.trim() || variables[newVarName]) return;

    onChange({
      ...variables,
      [newVarName]: {
        name: newVarName,
        type: 'string',
        required: false,
      },
    });
    setNewVarName('');
  };

  const handleRemoveVariable = (name: string) => {
    const updated = { ...variables };
    delete updated[name];
    onChange(updated);
  };

  const handleUpdateVariable = (
    name: string,
    updates: Partial<VariableDefinition>
  ) => {
    onChange({
      ...variables,
      [name]: {
        ...variables[name],
        ...updates,
      },
    });
  };

  const variableList = Object.values(variables);

  return (
    <div className="space-y-3">
      {/* Add Variable */}
      <div className="flex gap-2">
        <Input
          value={newVarName}
          onChange={(e) => setNewVarName(e.target.value)}
          placeholder="Variable name"
          className="bg-zinc-900 border-zinc-700 text-zinc-100 flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddVariable();
          }}
        />
        <Button
          variant="outline"
          size="icon"
          className="border-zinc-700 text-zinc-400 hover:bg-zinc-800"
          onClick={handleAddVariable}
          disabled={!newVarName.trim() || !!variables[newVarName]}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Variable List */}
      {variableList.length === 0 ? (
        <div className="text-center py-6">
          <Code2 className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
          <p className="text-xs text-zinc-500">No variables defined</p>
          <p className="text-xs text-zinc-600 mt-1">
            Add variables that will be passed to your workflow
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {variableList.map((variable) => (
            <motion.div
              key={variable.name}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 p-2 rounded-lg bg-zinc-900/50 border border-zinc-800"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-zinc-200 truncate">
                    {variable.name}
                  </span>
                  {variable.required && (
                    <Badge
                      variant="secondary"
                      className="bg-warning/20 text-warning text-[10px] px-1"
                    >
                      Required
                    </Badge>
                  )}
                </div>
              </div>

              <select
                value={variable.type}
                onChange={(e) =>
                  handleUpdateVariable(variable.name, {
                    type: e.target.value as VariableDefinition['type'],
                  })
                }
                className="h-7 rounded border border-zinc-700 bg-zinc-800 px-2 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-600"
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="object">Object</option>
                <option value="array">Array</option>
              </select>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-zinc-500 hover:text-destructive"
                onClick={() => handleRemoveVariable(variable.name)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// Form Field Component
function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-zinc-400">{label}</Label>
      {children}
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: Workflow['status'] }) {
  const config = {
    draft: {
      label: 'Draft',
      className: 'bg-zinc-800 text-zinc-400',
    },
    published: {
      label: 'Published',
      className: 'bg-success/20 text-success',
    },
    archived: {
      label: 'Archived',
      className: 'bg-zinc-800 text-zinc-500',
    },
  };

  const { label, className } = config[status] || config.draft;

  return (
    <Badge variant="secondary" className={cn('text-xs', className)}>
      {label}
    </Badge>
  );
}

export default WorkflowSettings;
