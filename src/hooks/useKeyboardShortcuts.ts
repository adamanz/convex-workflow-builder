import { useEffect, useCallback, useRef } from 'react';

/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
  /** Key code (e.g., 's', 'z', 'Delete', 'Escape') */
  key: string;
  /** Require Ctrl/Cmd key */
  ctrlKey?: boolean;
  /** Require Shift key */
  shiftKey?: boolean;
  /** Require Alt/Option key */
  altKey?: boolean;
  /** Handler function */
  handler: (event: KeyboardEvent) => void;
  /** Description for help display */
  description?: string;
  /** Prevent default browser behavior */
  preventDefault?: boolean;
  /** Stop event propagation */
  stopPropagation?: boolean;
  /** Only trigger when not in an input field */
  ignoreInputs?: boolean;
}

/**
 * Common shortcut presets
 */
export const shortcutPresets = {
  save: { key: 's', ctrlKey: true, description: 'Save', preventDefault: true },
  undo: { key: 'z', ctrlKey: true, description: 'Undo', preventDefault: true },
  redo: { key: 'z', ctrlKey: true, shiftKey: true, description: 'Redo', preventDefault: true },
  redoAlt: { key: 'y', ctrlKey: true, description: 'Redo (Alt)', preventDefault: true },
  delete: { key: 'Delete', description: 'Delete selected', ignoreInputs: true },
  backspace: { key: 'Backspace', description: 'Delete selected', ignoreInputs: true },
  escape: { key: 'Escape', description: 'Deselect all' },
  selectAll: { key: 'a', ctrlKey: true, description: 'Select all', preventDefault: true },
  copy: { key: 'c', ctrlKey: true, description: 'Copy' },
  paste: { key: 'v', ctrlKey: true, description: 'Paste' },
  cut: { key: 'x', ctrlKey: true, description: 'Cut' },
  duplicate: { key: 'd', ctrlKey: true, description: 'Duplicate', preventDefault: true },
  zoomIn: { key: '=', ctrlKey: true, description: 'Zoom in', preventDefault: true },
  zoomOut: { key: '-', ctrlKey: true, description: 'Zoom out', preventDefault: true },
  fitView: { key: '0', ctrlKey: true, description: 'Fit view', preventDefault: true },
  search: { key: 'f', ctrlKey: true, description: 'Search', preventDefault: true },
  help: { key: '?', shiftKey: true, description: 'Show help' },
} as const;

/**
 * Check if the current platform is Mac
 */
function isMac(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

/**
 * Check if the event matches the shortcut
 */
function matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
  // Check key (case-insensitive for letters)
  const eventKey = event.key.toLowerCase();
  const shortcutKey = shortcut.key.toLowerCase();

  if (eventKey !== shortcutKey) {
    return false;
  }

  // Check modifier keys (Ctrl on Windows/Linux, Cmd on Mac)
  const ctrlOrCmd = isMac() ? event.metaKey : event.ctrlKey;

  if (shortcut.ctrlKey && !ctrlOrCmd) {
    return false;
  }

  if (!shortcut.ctrlKey && ctrlOrCmd) {
    return false;
  }

  if (shortcut.shiftKey && !event.shiftKey) {
    return false;
  }

  if (!shortcut.shiftKey && event.shiftKey && shortcut.key.length === 1) {
    // Allow shift for single-character keys (for uppercase letters)
    // But if shiftKey is explicitly false, don't match
    return false;
  }

  if (shortcut.altKey && !event.altKey) {
    return false;
  }

  if (!shortcut.altKey && event.altKey) {
    return false;
  }

  return true;
}

/**
 * Check if the event target is an input element
 */
function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  const isInput =
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    target.isContentEditable;

  return isInput;
}

/**
 * Hook options
 */
export interface UseKeyboardShortcutsOptions {
  /** Whether shortcuts are enabled */
  enabled?: boolean;
  /** Custom key handler for unmatched keys */
  onKeyDown?: (event: KeyboardEvent) => void;
}

/**
 * Custom hook for handling keyboard shortcuts
 *
 * Provides a declarative way to define keyboard shortcuts
 * with support for modifier keys, input field detection,
 * and cross-platform compatibility (Ctrl/Cmd).
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
): void {
  const { enabled = true, onKeyDown } = options;

  // Store shortcuts in a ref to avoid re-registering on every change
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Call custom handler first
      onKeyDown?.(event);

      // Find matching shortcut
      for (const shortcut of shortcutsRef.current) {
        if (!matchesShortcut(event, shortcut)) {
          continue;
        }

        // Check if we should ignore inputs
        if (shortcut.ignoreInputs && isInputElement(event.target)) {
          continue;
        }

        // Prevent default if specified
        if (shortcut.preventDefault) {
          event.preventDefault();
        }

        // Stop propagation if specified
        if (shortcut.stopPropagation) {
          event.stopPropagation();
        }

        // Call handler
        shortcut.handler(event);

        // Only handle first matching shortcut
        break;
      }
    },
    [enabled, onKeyDown]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}

/**
 * Canvas-specific keyboard shortcuts
 */
export interface CanvasShortcutHandlers {
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onDelete?: () => void;
  onEscape?: () => void;
  onSelectAll?: () => void;
  onDuplicate?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onCut?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitView?: () => void;
  onSearch?: () => void;
  onHelp?: () => void;
}

/**
 * Hook for common canvas keyboard shortcuts
 *
 * Pre-configured shortcuts for workflow builder canvas
 * with handlers for save, undo, redo, delete, etc.
 */
export function useCanvasShortcuts(
  handlers: CanvasShortcutHandlers,
  options: UseKeyboardShortcutsOptions = {}
): void {
  const shortcuts = useMemo(() => {
    const result: KeyboardShortcut[] = [];

    if (handlers.onSave) {
      result.push({
        ...shortcutPresets.save,
        handler: handlers.onSave,
      });
    }

    if (handlers.onUndo) {
      result.push({
        ...shortcutPresets.undo,
        handler: handlers.onUndo,
      });
    }

    if (handlers.onRedo) {
      result.push(
        {
          ...shortcutPresets.redo,
          handler: handlers.onRedo,
        },
        {
          ...shortcutPresets.redoAlt,
          handler: handlers.onRedo,
        }
      );
    }

    if (handlers.onDelete) {
      result.push(
        {
          ...shortcutPresets.delete,
          handler: handlers.onDelete,
        },
        {
          ...shortcutPresets.backspace,
          handler: handlers.onDelete,
        }
      );
    }

    if (handlers.onEscape) {
      result.push({
        ...shortcutPresets.escape,
        handler: handlers.onEscape,
      });
    }

    if (handlers.onSelectAll) {
      result.push({
        ...shortcutPresets.selectAll,
        handler: handlers.onSelectAll,
      });
    }

    if (handlers.onDuplicate) {
      result.push({
        ...shortcutPresets.duplicate,
        handler: handlers.onDuplicate,
      });
    }

    if (handlers.onCopy) {
      result.push({
        ...shortcutPresets.copy,
        handler: handlers.onCopy,
      });
    }

    if (handlers.onPaste) {
      result.push({
        ...shortcutPresets.paste,
        handler: handlers.onPaste,
      });
    }

    if (handlers.onCut) {
      result.push({
        ...shortcutPresets.cut,
        handler: handlers.onCut,
      });
    }

    if (handlers.onZoomIn) {
      result.push({
        ...shortcutPresets.zoomIn,
        handler: handlers.onZoomIn,
      });
    }

    if (handlers.onZoomOut) {
      result.push({
        ...shortcutPresets.zoomOut,
        handler: handlers.onZoomOut,
      });
    }

    if (handlers.onFitView) {
      result.push({
        ...shortcutPresets.fitView,
        handler: handlers.onFitView,
      });
    }

    if (handlers.onSearch) {
      result.push({
        ...shortcutPresets.search,
        handler: handlers.onSearch,
      });
    }

    if (handlers.onHelp) {
      result.push({
        ...shortcutPresets.help,
        handler: handlers.onHelp,
      });
    }

    return result;
  }, [handlers]);

  useKeyboardShortcuts(shortcuts, options);
}

/**
 * Helper to create useMemo dependencies
 */
function useMemo<T>(factory: () => T, deps: React.DependencyList): T {
  const ref = useRef<{ deps: React.DependencyList; value: T } | null>(null);

  if (!ref.current || !depsEqual(ref.current.deps, deps)) {
    ref.current = { deps, value: factory() };
  }

  return ref.current.value;
}

function depsEqual(a: React.DependencyList, b: React.DependencyList): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) return false;
  }
  return true;
}

/**
 * Get formatted shortcut key string for display
 */
export function formatShortcut(shortcut: Pick<KeyboardShortcut, 'key' | 'ctrlKey' | 'shiftKey' | 'altKey'>): string {
  const parts: string[] = [];

  if (shortcut.ctrlKey) {
    parts.push(isMac() ? 'Cmd' : 'Ctrl');
  }

  if (shortcut.altKey) {
    parts.push(isMac() ? 'Option' : 'Alt');
  }

  if (shortcut.shiftKey) {
    parts.push('Shift');
  }

  // Format key name
  let keyName = shortcut.key;
  if (keyName.length === 1) {
    keyName = keyName.toUpperCase();
  } else if (keyName === 'Delete') {
    keyName = isMac() ? 'Del' : 'Delete';
  } else if (keyName === 'Backspace') {
    keyName = isMac() ? 'Backspace' : 'Backspace';
  }

  parts.push(keyName);

  return parts.join('+');
}

/**
 * Get list of all available shortcuts with descriptions
 */
export function getShortcutList(): Array<{ key: string; description: string }> {
  return Object.entries(shortcutPresets).map(([, preset]) => ({
    key: formatShortcut(preset),
    description: preset.description,
  }));
}
