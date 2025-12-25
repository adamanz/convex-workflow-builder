import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  AlertTriangle,
  Info,
  Bug,
  Copy,
  Check,
} from 'lucide-react';
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  memo,
} from 'react';
import { cn, formatTimestamp, safeStringify } from '../../lib/utils';
import type { ExecutionLog } from '../../types/workflow';

interface LogViewerProps {
  logs: ExecutionLog[];
  className?: string;
  maxHeight?: string;
  autoScroll?: boolean;
  showTimestamps?: boolean;
  showNodeIds?: boolean;
  onClear?: () => void;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Log level configuration
 */
const logLevelConfig: Record<
  LogLevel,
  {
    icon: typeof Info;
    color: string;
    bgColor: string;
    label: string;
  }
> = {
  debug: {
    icon: Bug,
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-800',
    label: 'DEBUG',
  },
  info: {
    icon: Info,
    color: 'text-blue-400',
    bgColor: 'bg-blue-950/30',
    label: 'INFO',
  },
  warn: {
    icon: AlertTriangle,
    color: 'text-amber-400',
    bgColor: 'bg-amber-950/30',
    label: 'WARN',
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-950/30',
    label: 'ERROR',
  },
};

/**
 * Single log entry component (memoized for performance)
 */
const LogEntry = memo(function LogEntry({
  log,
  showTimestamp,
  showNodeId,
  isHighlighted,
}: {
  log: ExecutionLog;
  showTimestamp: boolean;
  showNodeId: boolean;
  isHighlighted: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const config = logLevelConfig[log.level];
  const LogIcon = config.icon;

  const hasData = log.data !== undefined && log.data !== null;

  const handleCopy = async () => {
    const text = hasData
      ? `${log.message}\n${safeStringify(log.data)}`
      : log.message;
    await navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <motion.div
      className={cn(
        'group flex items-start gap-2 px-3 py-1.5 font-mono text-xs',
        'hover:bg-zinc-900/50 transition-colors',
        isHighlighted && 'bg-amber-950/20 border-l-2 border-amber-500'
      )}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      {/* Timestamp */}
      {showTimestamp && (
        <span className="text-zinc-600 flex-shrink-0 w-24">
          {formatTimestamp(log.timestamp)}
        </span>
      )}

      {/* Level badge */}
      <span
        className={cn(
          'flex items-center gap-1 px-1.5 py-0.5 rounded flex-shrink-0',
          config.bgColor,
          config.color
        )}
      >
        <LogIcon className="w-3 h-3" />
        <span className="text-[10px] font-semibold">{config.label}</span>
      </span>

      {/* Node ID */}
      {showNodeId && log.nodeId && (
        <span className="text-purple-400 flex-shrink-0 truncate max-w-20">
          [{log.nodeId}]
        </span>
      )}

      {/* Message */}
      <span className={cn('flex-1 break-words', config.color)}>
        {log.message}
      </span>

      {/* Data indicator */}
      {hasData && (
        <button
          className="text-zinc-500 hover:text-zinc-300 flex-shrink-0"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>
      )}

      {/* Copy button */}
      <button
        className={cn(
          'text-zinc-500 hover:text-zinc-300 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity'
        )}
        onClick={handleCopy}
        title="Copy log entry"
      >
        {isCopied ? (
          <Check className="w-3 h-3 text-emerald-400" />
        ) : (
          <Copy className="w-3 h-3" />
        )}
      </button>

      {/* Expanded data view */}
      <AnimatePresence>
        {isExpanded && hasData && (
          <motion.div
            className="absolute left-0 right-0 mt-6 mx-3 z-10"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <pre className="text-[10px] text-zinc-400 bg-zinc-900 p-2 rounded border border-zinc-800 overflow-x-auto max-h-40">
              {safeStringify(log.data)}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

/**
 * Filter dropdown component
 */
function FilterDropdown({
  activeFilters,
  onChange,
}: {
  activeFilters: Set<LogLevel>;
  onChange: (filters: Set<LogLevel>) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleFilter = (level: LogLevel) => {
    const newFilters = new Set(activeFilters);
    if (newFilters.has(level)) {
      newFilters.delete(level);
    } else {
      newFilters.add(level);
    }
    onChange(newFilters);
  };

  return (
    <div className="relative">
      <button
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded text-xs',
          'bg-zinc-800 text-zinc-400 hover:text-zinc-200',
          'border border-zinc-700 hover:border-zinc-600',
          'transition-colors'
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Filter className="w-3 h-3" />
        Filter
        {activeFilters.size < 4 && (
          <span className="ml-1 px-1 bg-zinc-700 rounded text-[10px]">
            {activeFilters.size}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute top-full left-0 mt-1 z-20 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-2 min-w-32"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {(Object.keys(logLevelConfig) as LogLevel[]).map((level) => {
              const config = logLevelConfig[level];
              const isActive = activeFilters.has(level);
              return (
                <button
                  key={level}
                  className={cn(
                    'flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs',
                    'transition-colors',
                    isActive
                      ? 'bg-zinc-800 text-zinc-200'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  )}
                  onClick={() => toggleFilter(level)}
                >
                  <config.icon className={cn('w-3 h-3', config.color)} />
                  <span>{config.label}</span>
                  {isActive && <Check className="w-3 h-3 ml-auto" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Real-time log viewer component
 *
 * Features:
 * - Auto-scrolling log output
 * - Color-coded log levels
 * - Timestamp display
 * - Search/filter capability
 * - Virtualized rendering for performance
 */
export function LogViewer({
  logs,
  className,
  maxHeight = '400px',
  autoScroll = true,
  showTimestamps = true,
  showNodeIds = true,
  onClear,
}: LogViewerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Set<LogLevel>>(
    new Set(['debug', 'info', 'warn', 'error'])
  );
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(autoScroll);
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Filter and search logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Filter by level
      if (!activeFilters.has(log.level)) {
        return false;
      }

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const messageMatch = log.message.toLowerCase().includes(query);
        const nodeIdMatch = log.nodeId?.toLowerCase().includes(query);
        const dataMatch = log.data
          ? safeStringify(log.data).toLowerCase().includes(query)
          : false;
        return messageMatch || nodeIdMatch || dataMatch;
      }

      return true;
    });
  }, [logs, activeFilters, searchQuery]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (isAutoScrollEnabled && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs.length, isAutoScrollEnabled]);

  // Detect manual scroll to disable auto-scroll
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

    if (isAtBottom !== isAutoScrollEnabled) {
      setIsAutoScrollEnabled(isAtBottom);
    }
  }, [isAutoScrollEnabled]);

  // Export logs as JSON
  const handleExport = () => {
    const data = safeStringify(filteredLogs);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `execution-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={cn(
        'flex flex-col bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden',
        className
      )}
    >
      {/* Header toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-zinc-800 bg-zinc-900/50">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full pl-7 pr-3 py-1.5 text-xs rounded',
              'bg-zinc-800 text-zinc-200 placeholder-zinc-500',
              'border border-zinc-700 focus:border-zinc-600',
              'focus:outline-none focus:ring-1 focus:ring-zinc-600'
            )}
          />
        </div>

        {/* Filter dropdown */}
        <FilterDropdown
          activeFilters={activeFilters}
          onChange={setActiveFilters}
        />

        {/* Action buttons */}
        <button
          className={cn(
            'p-1.5 rounded text-zinc-400 hover:text-zinc-200',
            'hover:bg-zinc-800 transition-colors'
          )}
          onClick={handleExport}
          title="Export logs"
        >
          <Download className="w-3.5 h-3.5" />
        </button>

        {onClear && (
          <button
            className={cn(
              'p-1.5 rounded text-zinc-400 hover:text-red-400',
              'hover:bg-zinc-800 transition-colors'
            )}
            onClick={onClear}
            title="Clear logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Log entries */}
      <div
        ref={containerRef}
        className="overflow-y-auto"
        style={{ maxHeight }}
        onScroll={handleScroll}
      >
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-zinc-500">
            <p className="text-sm">
              {logs.length === 0
                ? 'No logs yet'
                : 'No logs match your filters'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {filteredLogs.map((log) => (
              <LogEntry
                key={log._id}
                log={log}
                showTimestamp={showTimestamps}
                showNodeId={showNodeIds}
                isHighlighted={
                  !!searchQuery &&
                  log.message.toLowerCase().includes(searchQuery.toLowerCase())
                }
              />
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* Footer status bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-zinc-800 bg-zinc-900/50 text-xs text-zinc-500">
        <span>
          {filteredLogs.length} of {logs.length} entries
        </span>
        <button
          className={cn(
            'flex items-center gap-1 px-2 py-0.5 rounded transition-colors',
            isAutoScrollEnabled
              ? 'bg-blue-950/50 text-blue-400'
              : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
          )}
          onClick={() => setIsAutoScrollEnabled(!isAutoScrollEnabled)}
        >
          <span className="text-[10px]">Auto-scroll</span>
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              isAutoScrollEnabled ? 'bg-blue-400' : 'bg-zinc-600'
            )}
          />
        </button>
      </div>
    </div>
  );
}

/**
 * Loading skeleton for log viewer
 */
export function LogViewerSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center gap-2 p-2 border-b border-zinc-800">
        <div className="h-7 flex-1 bg-zinc-800 rounded" />
        <div className="h-7 w-16 bg-zinc-800 rounded" />
      </div>
      <div className="space-y-1 p-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 h-6">
            <div className="w-20 h-4 bg-zinc-800 rounded" />
            <div className="w-12 h-4 bg-zinc-800 rounded" />
            <div
              className="flex-1 h-4 bg-zinc-800 rounded"
              style={{ width: `${Math.random() * 40 + 40}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default LogViewer;
