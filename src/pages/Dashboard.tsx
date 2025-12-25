/**
 * Dashboard Page
 *
 * Main dashboard showing workflow cards, recent executions,
 * and quick actions for creating new workflows.
 */
import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Play,
  Edit3,
  Copy,
  Archive,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Workflow,
  LayoutGrid,
  List,
  ChevronDown,
  TrendingUp,
  Activity,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { cn, formatRelativeTime, formatDuration } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../components/ui/card';

interface DashboardProps {
  onNavigateToEditor?: (workflowId: string) => void;
  onNavigateToExecution?: (executionId: string) => void;
}

// Status badge configuration
const statusConfig = {
  draft: { label: 'Draft', variant: 'secondary' as const, icon: Edit3 },
  published: { label: 'Published', variant: 'success' as const, icon: CheckCircle2 },
  archived: { label: 'Archived', variant: 'outline' as const, icon: Archive },
};

const executionStatusConfig = {
  pending: { color: 'text-zinc-400', bg: 'bg-zinc-800', icon: Clock },
  running: { color: 'text-blue-400', bg: 'bg-blue-950/50', icon: Loader2 },
  completed: { color: 'text-emerald-400', bg: 'bg-emerald-950/50', icon: CheckCircle2 },
  failed: { color: 'text-red-400', bg: 'bg-red-950/50', icon: XCircle },
  cancelled: { color: 'text-amber-400', bg: 'bg-amber-950/50', icon: AlertCircle },
};

/**
 * Loading skeleton for workflow cards
 */
function WorkflowCardSkeleton() {
  return (
    <div className="animate-pulse">
      <Card className="h-full bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-5 w-3/4 bg-zinc-800 rounded" />
              <div className="h-4 w-1/2 bg-zinc-800 rounded" />
            </div>
            <div className="h-6 w-16 bg-zinc-800 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex items-center gap-4">
            <div className="h-8 w-20 bg-zinc-800 rounded" />
            <div className="h-8 w-20 bg-zinc-800 rounded" />
          </div>
        </CardContent>
        <CardFooter className="pt-3 border-t border-zinc-800">
          <div className="h-4 w-32 bg-zinc-800 rounded" />
        </CardFooter>
      </Card>
    </div>
  );
}

/**
 * Empty state when no workflows exist
 */
function EmptyState({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-20 px-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="relative mb-6">
        <motion.div
          className="absolute inset-0 bg-primary/20 rounded-full blur-xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <div className="relative bg-zinc-900 border border-zinc-800 rounded-full p-6">
          <Workflow className="w-12 h-12 text-primary" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-2">
        No workflows yet
      </h2>
      <p className="text-muted-foreground text-center max-w-md mb-6">
        Create your first workflow to automate tasks, integrate services, and
        build powerful automation pipelines.
      </p>
      <Button onClick={onCreateNew} size="lg" className="gap-2">
        <Plus className="w-5 h-5" />
        Create Your First Workflow
      </Button>
    </motion.div>
  );
}

/**
 * Individual workflow card component
 */
function WorkflowCard({
  workflow,
  onEdit,
  onRun,
  onDuplicate,
  onArchive,
  onDelete,
}: {
  workflow: {
    _id: Id<'workflows'>;
    name: string;
    description?: string;
    status: 'draft' | 'published' | 'archived';
    nodes: unknown[];
    updatedAt: number;
    executionStats: { total: number; running: number };
  };
  onEdit: () => void;
  onRun: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const statusInfo = statusConfig[workflow.status];
  const StatusIcon = statusInfo.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      whileHover={{ y: -2 }}
    >
      <Card className="h-full bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold text-foreground truncate">
                {workflow.name}
              </CardTitle>
              {workflow.description && (
                <CardDescription className="line-clamp-2 mt-1">
                  {workflow.description}
                </CardDescription>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant={statusInfo.variant} className="gap-1">
                <StatusIcon className="w-3 h-3" />
                {statusInfo.label}
              </Badge>
              <div className="relative">
                <button
                  className={cn(
                    'p-1.5 rounded-md text-zinc-400 hover:text-zinc-200',
                    'hover:bg-zinc-800 transition-colors',
                    'opacity-0 group-hover:opacity-100',
                    isMenuOpen && 'opacity-100 bg-zinc-800'
                  )}
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                <AnimatePresence>
                  {isMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsMenuOpen(false)}
                      />
                      <motion.div
                        className="absolute right-0 top-full mt-1 z-20 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden min-w-40"
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                      >
                        <button
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                          onClick={() => {
                            setIsMenuOpen(false);
                            onEdit();
                          }}
                        >
                          <Edit3 className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                          onClick={() => {
                            setIsMenuOpen(false);
                            onDuplicate();
                          }}
                        >
                          <Copy className="w-4 h-4" />
                          Duplicate
                        </button>
                        <button
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                          onClick={() => {
                            setIsMenuOpen(false);
                            onArchive();
                          }}
                        >
                          <Archive className="w-4 h-4" />
                          {workflow.status === 'archived' ? 'Unarchive' : 'Archive'}
                        </button>
                        <div className="border-t border-zinc-800" />
                        <button
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-950/50 transition-colors"
                          onClick={() => {
                            setIsMenuOpen(false);
                            onDelete();
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <Workflow className="w-4 h-4" />
              <span>{workflow.nodes.length} nodes</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <Activity className="w-4 h-4" />
              <span>{workflow.executionStats.total} runs</span>
            </div>
            {workflow.executionStats.running > 0 && (
              <div className="flex items-center gap-1.5 text-blue-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{workflow.executionStats.running} running</span>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="pt-3 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            Updated {formatRelativeTime(workflow.updatedAt)}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={onEdit}
            >
              <Edit3 className="w-3.5 h-3.5 mr-1" />
              Edit
            </Button>
            {workflow.status === 'published' && (
              <Button
                variant="default"
                size="sm"
                className="h-7 px-2"
                onClick={onRun}
              >
                <Play className="w-3.5 h-3.5 mr-1" />
                Run
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

/**
 * Recent executions list component
 */
function RecentExecutions({
  executions,
  onViewExecution,
}: {
  executions: Array<{
    _id: Id<'workflowExecutions'>;
    workflowName: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    startedAt: number;
    completedAt?: number;
  }>;
  onViewExecution: (id: string) => void;
}) {
  if (executions.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-zinc-500">
        <p className="text-sm">No recent executions</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {executions.map((execution, index) => {
        const config = executionStatusConfig[execution.status];
        const StatusIcon = config.icon;
        const duration =
          execution.completedAt && execution.startedAt
            ? execution.completedAt - execution.startedAt
            : null;

        return (
          <motion.button
            key={execution._id}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg',
              'bg-zinc-900/30 hover:bg-zinc-900/60 border border-zinc-800/50',
              'hover:border-zinc-700 transition-all text-left'
            )}
            onClick={() => onViewExecution(execution._id)}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0',
                config.bg
              )}
            >
              <StatusIcon
                className={cn(
                  'w-4 h-4',
                  config.color,
                  execution.status === 'running' && 'animate-spin'
                )}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-200 truncate">
                {execution.workflowName}
              </p>
              <p className="text-xs text-zinc-500">
                {formatRelativeTime(execution.startedAt)}
                {duration && ` - ${formatDuration(duration)}`}
              </p>
            </div>
            <Badge
              variant={execution.status === 'completed' ? 'success' : 'secondary'}
              className="flex-shrink-0"
            >
              {execution.status}
            </Badge>
          </motion.button>
        );
      })}
    </div>
  );
}

/**
 * Stats card component
 */
function StatsCard({
  label,
  value,
  icon: Icon,
  trend,
  color = 'text-zinc-400',
}: {
  label: string;
  value: string | number;
  icon: typeof Activity;
  trend?: { value: number; label: string };
  color?: string;
}) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider">
              {label}
            </p>
            <p className={cn('text-2xl font-bold mt-1', color)}>{value}</p>
            {trend && (
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp
                  className={cn(
                    'w-3 h-3',
                    trend.value >= 0 ? 'text-emerald-400' : 'text-red-400'
                  )}
                />
                <span
                  className={cn(
                    'text-xs',
                    trend.value >= 0 ? 'text-emerald-400' : 'text-red-400'
                  )}
                >
                  {trend.value >= 0 ? '+' : ''}
                  {trend.value}% {trend.label}
                </span>
              </div>
            )}
          </div>
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <Icon className={cn('w-5 h-5', color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Main Dashboard component
 */
export function Dashboard({
  onNavigateToEditor,
  onNavigateToExecution,
}: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'draft' | 'published' | 'archived'
  >('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Convex queries
  const workflows = useQuery(api.workflows.listWorkflows, {
    status: statusFilter === 'all' ? undefined : statusFilter,
  });
  const recentExecutions = useQuery(api.executions.listExecutions, {
    limit: 5,
  });
  const stats = useQuery(api.executions.getExecutionStats, {
    timeRangeMs: 24 * 60 * 60 * 1000, // Last 24 hours
  });

  // Mutations
  const createWorkflow = useMutation(api.workflows.createWorkflow);
  const duplicateWorkflow = useMutation(api.workflows.duplicateWorkflow);
  const archiveWorkflow = useMutation(api.workflows.archiveWorkflow);
  const deleteWorkflow = useMutation(api.workflows.deleteWorkflow);
  const executeWorkflow = useMutation(api.executions.executeWorkflow);

  // Filter workflows by search query
  const filteredWorkflows = useMemo(() => {
    if (!workflows) return [];
    if (!searchQuery) return workflows;

    const query = searchQuery.toLowerCase();
    return workflows.filter(
      (w) =>
        w.name.toLowerCase().includes(query) ||
        w.description?.toLowerCase().includes(query)
    );
  }, [workflows, searchQuery]);

  // Handlers
  const handleCreateNew = async () => {
    const id = await createWorkflow({ name: 'Untitled Workflow' });
    onNavigateToEditor?.(id);
  };

  const handleEdit = (workflowId: string) => {
    onNavigateToEditor?.(workflowId);
  };

  const handleRun = async (workflowId: Id<'workflows'>) => {
    const executionId = await executeWorkflow({ workflowId });
    onNavigateToExecution?.(executionId);
  };

  const handleDuplicate = async (workflowId: Id<'workflows'>) => {
    await duplicateWorkflow({ id: workflowId });
  };

  const handleArchive = async (workflowId: Id<'workflows'>) => {
    await archiveWorkflow({ id: workflowId });
  };

  const handleDelete = async (workflowId: Id<'workflows'>) => {
    if (confirm('Are you sure you want to delete this workflow?')) {
      await deleteWorkflow({ id: workflowId });
    }
  };

  const isLoading = workflows === undefined;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Workflow className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-xl font-bold text-foreground">
                Workflow Builder
              </h1>
            </div>
            <Button onClick={handleCreateNew} className="gap-2">
              <Plus className="w-4 h-4" />
              New Workflow
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Row */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <StatsCard
            label="Total Workflows"
            value={workflows?.length ?? '-'}
            icon={Workflow}
          />
          <StatsCard
            label="Executions (24h)"
            value={stats?.total ?? '-'}
            icon={Activity}
            trend={{ value: 12, label: 'from yesterday' }}
          />
          <StatsCard
            label="Success Rate"
            value={stats?.successRate ? `${stats.successRate}%` : '-'}
            icon={CheckCircle2}
            color="text-emerald-400"
          />
          <StatsCard
            label="Avg Duration"
            value={stats?.averageDurationMs ? formatDuration(stats.averageDurationMs) : '-'}
            icon={Clock}
          />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main content area */}
          <div className="lg:col-span-3">
            {/* Search and filter bar */}
            <motion.div
              className="flex items-center gap-3 mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search workflows..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-zinc-900/50 border-zinc-800"
                />
              </div>

              {/* Filter dropdown */}
              <div className="relative">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                >
                  <Filter className="w-4 h-4" />
                  {statusFilter === 'all' ? 'All' : statusConfig[statusFilter].label}
                  <ChevronDown className="w-4 h-4" />
                </Button>
                <AnimatePresence>
                  {isFilterOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsFilterOpen(false)}
                      />
                      <motion.div
                        className="absolute right-0 top-full mt-2 z-20 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden min-w-36"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        {(['all', 'draft', 'published', 'archived'] as const).map(
                          (status) => (
                            <button
                              key={status}
                              className={cn(
                                'flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors',
                                statusFilter === status
                                  ? 'bg-zinc-800 text-zinc-100'
                                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                              )}
                              onClick={() => {
                                setStatusFilter(status);
                                setIsFilterOpen(false);
                              }}
                            >
                              {status === 'all' ? 'All' : statusConfig[status].label}
                            </button>
                          )
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* View mode toggle */}
              <div className="flex items-center border border-zinc-800 rounded-md">
                <button
                  className={cn(
                    'p-2 transition-colors',
                    viewMode === 'grid'
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-400 hover:text-zinc-200'
                  )}
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  className={cn(
                    'p-2 transition-colors',
                    viewMode === 'list'
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-400 hover:text-zinc-200'
                  )}
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </motion.div>

            {/* Workflow grid/list */}
            {isLoading ? (
              <div
                className={cn(
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                    : 'space-y-3'
                )}
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <WorkflowCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredWorkflows.length === 0 && !searchQuery ? (
              <EmptyState onCreateNew={handleCreateNew} />
            ) : filteredWorkflows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Search className="w-12 h-12 text-zinc-600 mb-4" />
                <p className="text-lg text-zinc-400">No workflows found</p>
                <p className="text-sm text-zinc-500">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            ) : (
              <motion.div
                className={cn(
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                    : 'space-y-3'
                )}
                layout
              >
                <AnimatePresence mode="popLayout">
                  {filteredWorkflows.map((workflow) => (
                    <WorkflowCard
                      key={workflow._id}
                      workflow={workflow}
                      onEdit={() => handleEdit(workflow._id)}
                      onRun={() => handleRun(workflow._id)}
                      onDuplicate={() => handleDuplicate(workflow._id)}
                      onArchive={() => handleArchive(workflow._id)}
                      onDelete={() => handleDelete(workflow._id)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>

          {/* Sidebar - Recent executions */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-zinc-900/50 border-zinc-800 sticky top-24">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Recent Executions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentExecutions === undefined ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="animate-pulse flex items-center gap-3">
                          <div className="w-8 h-8 bg-zinc-800 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 w-3/4 bg-zinc-800 rounded" />
                            <div className="h-3 w-1/2 bg-zinc-800 rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <RecentExecutions
                      executions={recentExecutions}
                      onViewExecution={(id) => onNavigateToExecution?.(id)}
                    />
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
