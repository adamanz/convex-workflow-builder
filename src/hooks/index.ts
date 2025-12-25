/**
 * Custom hooks for workflow builder
 */

// Execution hooks
export {
  useExecution,
  useExecutionList,
  useExecutionStats,
  type ExecutionState,
  type UseExecutionOptions,
} from './useExecution';

// Workflow hooks
export {
  useWorkflow,
  useWorkflowList,
  useCreateWorkflow,
  type WorkflowState,
  type WorkflowCreateData,
  type WorkflowUpdates,
  type UseWorkflowOptions,
} from './useWorkflow';

// Canvas hooks
export {
  useCanvas,
  type CanvasState,
  type UseCanvasOptions,
} from './useCanvas';

// Keyboard shortcuts
export {
  useKeyboardShortcuts,
  useCanvasShortcuts,
  formatShortcut,
  getShortcutList,
  shortcutPresets,
  type KeyboardShortcut,
  type CanvasShortcutHandlers,
  type UseKeyboardShortcutsOptions,
} from './useKeyboardShortcuts';

// Auto-save
export {
  useAutoSave,
  useSimpleAutoSave,
  formatLastSaved,
  getStatusIndicator,
  type AutoSaveState,
  type AutoSaveStatus,
  type UseAutoSaveOptions,
} from './useAutoSave';
