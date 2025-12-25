import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Play,
  Square,
  Zap,
  Database,
  Search as SearchIcon,
  GitBranch,
  Clock,
  GitMerge,
  Repeat,
  Sparkles,
  GripVertical,
  AlertCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { NodeType, StepTemplate } from '@/types/workflow';

// Node category definitions
interface NodeCategory {
  id: string;
  name: string;
  description: string;
  nodes: StepTemplate[];
}

// Default node templates
const defaultNodeTemplates: StepTemplate[] = [
  {
    _id: 'start',
    name: 'Start',
    description: 'Entry point of the workflow',
    type: 'start',
    icon: 'Play',
    category: 'core',
    configSchema: {},
    defaultConfig: {},
    color: '#22c55e',
  },
  {
    _id: 'end',
    name: 'End',
    description: 'Exit point of the workflow',
    type: 'end',
    icon: 'Square',
    category: 'core',
    configSchema: {},
    defaultConfig: {},
    color: '#ef4444',
  },
  {
    _id: 'action',
    name: 'Action',
    description: 'Execute an HTTP request or custom action',
    type: 'action',
    icon: 'Zap',
    category: 'core',
    configSchema: {},
    defaultConfig: {
      actionType: 'http',
      method: 'GET',
    },
    color: '#3b82f6',
  },
  {
    _id: 'mutation',
    name: 'Mutation',
    description: 'Run a Convex mutation',
    type: 'mutation',
    icon: 'Database',
    category: 'data',
    configSchema: {},
    defaultConfig: {
      actionType: 'internal',
    },
    color: '#8b5cf6',
  },
  {
    _id: 'query',
    name: 'Query',
    description: 'Run a Convex query',
    type: 'query',
    icon: 'SearchIcon',
    category: 'data',
    configSchema: {},
    defaultConfig: {
      actionType: 'internal',
    },
    color: '#06b6d4',
  },
  {
    _id: 'condition',
    name: 'Condition',
    description: 'Branch based on a condition',
    type: 'condition',
    icon: 'GitBranch',
    category: 'logic',
    configSchema: {},
    defaultConfig: {
      conditionType: 'expression',
    },
    color: '#f59e0b',
  },
  {
    _id: 'delay',
    name: 'Delay',
    description: 'Wait for a specified duration',
    type: 'delay',
    icon: 'Clock',
    category: 'logic',
    configSchema: {},
    defaultConfig: {
      delayType: 'duration',
      durationMs: 1000,
    },
    color: '#64748b',
  },
  {
    _id: 'parallel',
    name: 'Parallel',
    description: 'Execute multiple branches in parallel',
    type: 'parallel',
    icon: 'GitMerge',
    category: 'logic',
    configSchema: {},
    defaultConfig: {
      branches: [],
      waitForAll: true,
    },
    color: '#ec4899',
  },
  {
    _id: 'loop',
    name: 'Loop',
    description: 'Iterate over an array',
    type: 'loop',
    icon: 'Repeat',
    category: 'logic',
    configSchema: {},
    defaultConfig: {
      iterateOver: '',
      itemVariable: 'item',
    },
    color: '#14b8a6',
  },
  {
    _id: 'ai',
    name: 'AI',
    description: 'Generate content with AI',
    type: 'ai',
    icon: 'Sparkles',
    category: 'ai',
    configSchema: {},
    defaultConfig: {
      model: 'gpt-4',
      prompt: '',
      temperature: 0.7,
      maxTokens: 1024,
    },
    color: '#a855f7',
  },
];

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Play,
  Square,
  Zap,
  Database,
  SearchIcon,
  GitBranch,
  Clock,
  GitMerge,
  Repeat,
  Sparkles,
};

// Category configuration
const categories: { id: string; name: string; description: string }[] = [
  { id: 'core', name: 'Core', description: 'Essential workflow nodes' },
  { id: 'data', name: 'Data', description: 'Database operations' },
  { id: 'logic', name: 'Logic', description: 'Control flow nodes' },
  { id: 'ai', name: 'AI', description: 'AI-powered nodes' },
];

interface NodePaletteProps {
  onDragStart?: (template: StepTemplate) => void;
  onDragEnd?: () => void;
  customTemplates?: StepTemplate[];
}

export function NodePalette({
  onDragStart,
  onDragEnd,
  customTemplates = [],
}: NodePaletteProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(
    new Set(['core', 'data', 'logic', 'ai'])
  );
  const [draggingId, setDraggingId] = React.useState<string | null>(null);

  // Combine default and custom templates
  const allTemplates = React.useMemo(() => {
    return [...defaultNodeTemplates, ...customTemplates];
  }, [customTemplates]);

  // Group templates by category
  const groupedTemplates = React.useMemo(() => {
    const filtered = allTemplates.filter((template) => {
      const matchesSearch =
        searchQuery === '' ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });

    const grouped: Record<string, StepTemplate[]> = {};
    categories.forEach((cat) => {
      grouped[cat.id] = filtered.filter((t) => t.category === cat.id);
    });
    return grouped;
  }, [allTemplates, searchQuery]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    template: StepTemplate
  ) => {
    setDraggingId(template._id);
    e.dataTransfer.setData('application/json', JSON.stringify(template));
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart?.(template);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    onDragEnd?.();
  };

  const getIcon = (iconName: string) => {
    const Icon = iconMap[iconName];
    return Icon || AlertCircle;
  };

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="p-3 border-b border-zinc-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600 focus:ring-zinc-600"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        {categories.map((category) => {
          const templates = groupedTemplates[category.id] || [];
          const isExpanded = expandedCategories.has(category.id);
          const hasResults = templates.length > 0;

          if (!hasResults && searchQuery) return null;

          return (
            <div key={category.id} className="border-b border-zinc-800 last:border-b-0">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.id)}
                className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <motion.div
                    initial={false}
                    animate={{ rotate: isExpanded ? 0 : -90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-4 w-4 text-zinc-500" />
                  </motion.div>
                  <span className="text-sm font-medium text-zinc-200">
                    {category.name}
                  </span>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-zinc-800 text-zinc-400 text-xs px-1.5"
                >
                  {templates.length}
                </Badge>
              </button>

              {/* Category Content */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-2 pb-2 space-y-1">
                      {templates.map((template) => {
                        const Icon = getIcon(template.icon);
                        const isDragging = draggingId === template._id;

                        return (
                          <motion.div
                            key={template._id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, template)}
                            onDragEnd={handleDragEnd}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={cn(
                              'group relative flex items-center gap-3 rounded-lg p-2.5 cursor-grab active:cursor-grabbing transition-all',
                              'bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700',
                              isDragging && 'opacity-50 ring-2 ring-primary'
                            )}
                          >
                            {/* Drag Handle */}
                            <div className="absolute left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <GripVertical className="h-4 w-4 text-zinc-600" />
                            </div>

                            {/* Icon */}
                            <div
                              className="flex h-9 w-9 items-center justify-center rounded-lg ml-3"
                              style={{
                                backgroundColor: `${template.color}20`,
                              }}
                            >
                              <Icon
                                className="h-4 w-4"
                                style={{ color: template.color }}
                              />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-zinc-200 truncate">
                                  {template.name}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-500 truncate mt-0.5">
                                {template.description}
                              </p>
                            </div>

                            {/* Add indicator on hover */}
                            <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/20 text-primary">
                                <span className="text-xs font-bold">+</span>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}

                      {templates.length === 0 && (
                        <div className="px-3 py-4 text-center text-xs text-zinc-500">
                          No nodes found
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-2 border-t border-zinc-800 bg-zinc-950/50">
        <p className="text-xs text-zinc-500 text-center">
          Drag nodes to the canvas to add them
        </p>
      </div>
    </div>
  );
}

export default NodePalette;
