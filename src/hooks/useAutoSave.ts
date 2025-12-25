import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Auto-save status
 */
export type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

/**
 * Auto-save state returned by the hook
 */
export interface AutoSaveState {
  /** Current status */
  status: AutoSaveStatus;
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Last save timestamp */
  lastSavedAt: number | null;
  /** Last error message */
  error: string | null;
  /** Time until next auto-save (ms) */
  pendingTime: number | null;
  /** Manually trigger save */
  save: () => Promise<void>;
  /** Mark content as dirty */
  markDirty: () => void;
  /** Mark content as clean (after external save) */
  markClean: () => void;
  /** Reset error state */
  clearError: () => void;
}

/**
 * Hook options
 */
export interface UseAutoSaveOptions<T> {
  /** Data to save */
  data: T;
  /** Save function */
  onSave: (data: T) => Promise<void>;
  /** Debounce delay in milliseconds (default: 2000) */
  debounceMs?: number;
  /** Enable auto-save (default: true) */
  enabled?: boolean;
  /** Callback on successful save */
  onSuccess?: () => void;
  /** Callback on save error */
  onError?: (error: Error) => void;
  /** Comparison function to detect changes */
  compare?: (a: T, b: T) => boolean;
  /** Save on unmount if dirty (default: true) */
  saveOnUnmount?: boolean;
  /** Minimum interval between saves in milliseconds (default: 1000) */
  minInterval?: number;
}

/**
 * Default shallow comparison
 */
function defaultCompare<T>(a: T, b: T): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (a === null || b === null) return a === b;

  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if ((a as Record<string, unknown>)[key] !== (b as Record<string, unknown>)[key]) {
      return false;
    }
  }

  return true;
}

/**
 * Custom hook for auto-saving data with debounce
 *
 * Provides debounced saving, dirty state tracking,
 * save status indicators, and error handling.
 */
export function useAutoSave<T>(options: UseAutoSaveOptions<T>): AutoSaveState {
  const {
    data,
    onSave,
    debounceMs = 2000,
    enabled = true,
    onSuccess,
    onError,
    compare = defaultCompare,
    saveOnUnmount = true,
    minInterval = 1000,
  } = options;

  // State
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingTime, setPendingTime] = useState<number | null>(null);

  // Refs for stable values
  const dataRef = useRef<T>(data);
  const savedDataRef = useRef<T>(data);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSaveTimeRef = useRef<number>(0);
  const isSavingRef = useRef(false);
  const pendingStartRef = useRef<number | null>(null);

  // Update data ref
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Clear timer
  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    pendingStartRef.current = null;
    setPendingTime(null);
  }, []);

  // Perform save
  const performSave = useCallback(async () => {
    if (isSavingRef.current) return;

    const currentData = dataRef.current;

    // Check if we've saved too recently
    const now = Date.now();
    const timeSinceLastSave = now - lastSaveTimeRef.current;
    if (timeSinceLastSave < minInterval) {
      // Schedule for later
      const delay = minInterval - timeSinceLastSave;
      timeoutRef.current = setTimeout(() => performSave(), delay);
      return;
    }

    try {
      isSavingRef.current = true;
      setStatus('saving');
      clearTimer();

      await onSave(currentData);

      savedDataRef.current = currentData;
      lastSaveTimeRef.current = Date.now();
      setLastSavedAt(lastSaveTimeRef.current);
      setIsDirty(false);
      setStatus('saved');
      setError(null);
      onSuccess?.();

      // Reset to idle after a delay
      setTimeout(() => {
        setStatus((s) => (s === 'saved' ? 'idle' : s));
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save';
      setError(errorMessage);
      setStatus('error');
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      isSavingRef.current = false;
    }
  }, [onSave, onSuccess, onError, minInterval, clearTimer]);

  // Manual save
  const save = useCallback(async () => {
    clearTimer();
    await performSave();
  }, [clearTimer, performSave]);

  // Mark as dirty
  const markDirty = useCallback(() => {
    setIsDirty(true);
    setStatus('pending');
  }, []);

  // Mark as clean
  const markClean = useCallback(() => {
    setIsDirty(false);
    savedDataRef.current = dataRef.current;
    setLastSavedAt(Date.now());
    clearTimer();
    setStatus('idle');
  }, [clearTimer]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
    if (status === 'error') {
      setStatus(isDirty ? 'pending' : 'idle');
    }
  }, [status, isDirty]);

  // Schedule auto-save when data changes
  useEffect(() => {
    if (!enabled) return;

    // Check if data has changed
    const hasChanged = !compare(data, savedDataRef.current);

    if (!hasChanged) {
      return;
    }

    setIsDirty(true);
    setStatus('pending');

    // Clear existing timer
    clearTimer();

    // Start countdown timer
    pendingStartRef.current = Date.now();
    setPendingTime(debounceMs);

    // Update pending time every 100ms
    intervalRef.current = setInterval(() => {
      if (pendingStartRef.current) {
        const elapsed = Date.now() - pendingStartRef.current;
        const remaining = Math.max(0, debounceMs - elapsed);
        setPendingTime(remaining);
      }
    }, 100);

    // Schedule save
    timeoutRef.current = setTimeout(() => {
      performSave();
    }, debounceMs);

    return () => {
      clearTimer();
    };
  }, [data, enabled, debounceMs, compare, clearTimer, performSave]);

  // Save on unmount if dirty
  useEffect(() => {
    return () => {
      if (saveOnUnmount && isDirty && !isSavingRef.current) {
        // Can't await here, but the save should complete
        performSave();
      }
      clearTimer();
    };
  }, [saveOnUnmount, isDirty, performSave, clearTimer]);

  return {
    status,
    isDirty,
    lastSavedAt,
    error,
    pendingTime,
    save,
    markDirty,
    markClean,
    clearError,
  };
}

/**
 * Simple auto-save hook with just dirty tracking
 */
export function useSimpleAutoSave(
  onSave: () => Promise<void>,
  debounceMs = 2000
): Pick<AutoSaveState, 'status' | 'isDirty' | 'save' | 'markDirty' | 'markClean'> {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [isDirty, setIsDirty] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);

  const save = useCallback(async () => {
    if (isSavingRef.current || !isDirty) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    try {
      isSavingRef.current = true;
      setStatus('saving');
      await onSave();
      setIsDirty(false);
      setStatus('saved');

      setTimeout(() => {
        setStatus((s) => (s === 'saved' ? 'idle' : s));
      }, 2000);
    } catch {
      setStatus('error');
    } finally {
      isSavingRef.current = false;
    }
  }, [onSave, isDirty]);

  const markDirty = useCallback(() => {
    setIsDirty(true);
    setStatus('pending');

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      save();
    }, debounceMs);
  }, [save, debounceMs]);

  const markClean = useCallback(() => {
    setIsDirty(false);
    setStatus('idle');
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    status,
    isDirty,
    save,
    markDirty,
    markClean,
  };
}

/**
 * Format last saved time for display
 */
export function formatLastSaved(timestamp: number | null): string {
  if (!timestamp) return 'Never saved';

  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 1000) return 'Just saved';
  if (diff < 60000) {
    const seconds = Math.floor(diff / 1000);
    return `Saved ${seconds}s ago`;
  }
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `Saved ${minutes}m ago`;
  }

  const date = new Date(timestamp);
  return `Saved at ${date.toLocaleTimeString()}`;
}

/**
 * Get status indicator props for UI
 */
export function getStatusIndicator(status: AutoSaveStatus): {
  label: string;
  color: 'gray' | 'yellow' | 'blue' | 'green' | 'red';
  animate: boolean;
} {
  switch (status) {
    case 'idle':
      return { label: 'Up to date', color: 'gray', animate: false };
    case 'pending':
      return { label: 'Unsaved changes', color: 'yellow', animate: false };
    case 'saving':
      return { label: 'Saving...', color: 'blue', animate: true };
    case 'saved':
      return { label: 'Saved', color: 'green', animate: false };
    case 'error':
      return { label: 'Save failed', color: 'red', animate: false };
  }
}
