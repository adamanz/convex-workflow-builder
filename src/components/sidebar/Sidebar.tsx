import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid,
  Settings,
  History,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Workflow,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NodePalette } from './NodePalette';
import { PropertiesPanel } from './PropertiesPanel';
import { WorkflowSettings } from './WorkflowSettings';
import type { WorkflowNode, Workflow, StepTemplate } from '@/types/workflow';

type SidebarTab = 'nodes' | 'properties' | 'settings' | 'history';

interface SidebarProps {
  workflow?: Workflow;
  selectedNode: WorkflowNode | null;
  isCollapsed?: boolean;
  defaultTab?: SidebarTab;
  onToggleCollapse?: () => void;
  onUpdateNode?: (nodeId: string, updates: Partial<WorkflowNode>) => void;
  onDeleteNode?: (nodeId: string) => void;
  onUpdateWorkflow?: (updates: Partial<Workflow>) => void;
  onDragStart?: (template: StepTemplate) => void;
  onDragEnd?: () => void;
  customNodeTemplates?: StepTemplate[];
  className?: string;
}

interface TabConfig {
  id: SidebarTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
}

export function Sidebar({
  workflow,
  selectedNode,
  isCollapsed = false,
  defaultTab = 'nodes',
  onToggleCollapse,
  onUpdateNode,
  onDeleteNode,
  onUpdateWorkflow,
  onDragStart,
  onDragEnd,
  customNodeTemplates,
  className,
}: SidebarProps) {
  const [activeTab, setActiveTab] = React.useState<SidebarTab>(defaultTab);
  const [localCollapsed, setLocalCollapsed] = React.useState(isCollapsed);

  const collapsed = isCollapsed !== undefined ? isCollapsed : localCollapsed;

  // Auto-switch to properties tab when a node is selected
  React.useEffect(() => {
    if (selectedNode && activeTab === 'nodes') {
      setActiveTab('properties');
    }
  }, [selectedNode]);

  // Auto-switch to nodes tab when node is deselected and on properties tab
  React.useEffect(() => {
    if (!selectedNode && activeTab === 'properties') {
      setActiveTab('nodes');
    }
  }, [selectedNode, activeTab]);

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setLocalCollapsed(!localCollapsed);
    }
  };

  const tabs: TabConfig[] = [
    {
      id: 'nodes',
      label: 'Nodes',
      icon: LayoutGrid,
    },
    {
      id: 'properties',
      label: 'Properties',
      icon: Settings,
      badge: selectedNode ? '1' : undefined,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Workflow,
    },
    {
      id: 'history',
      label: 'History',
      icon: History,
    },
  ];

  return (
    <motion.aside
      initial={false}
      animate={{
        width: collapsed ? 56 : 320,
      }}
      transition={{
        duration: 0.2,
        ease: 'easeInOut',
      }}
      className={cn(
        'flex h-full flex-col border-r border-zinc-800 bg-zinc-950',
        className
      )}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between h-12 px-3 border-b border-zinc-800 shrink-0">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20">
                <Workflow className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-semibold text-zinc-200">
                Workflow Builder
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggle}
          className={cn(
            'h-8 w-8 text-zinc-500 hover:text-zinc-300',
            collapsed && 'mx-auto'
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Tabs */}
      <div
        className={cn(
          'flex shrink-0 border-b border-zinc-800',
          collapsed ? 'flex-col p-1.5 gap-1' : 'flex-row p-1.5 gap-1'
        )}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'relative flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                collapsed ? 'w-full' : 'flex-1',
                isActive
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="truncate"
                >
                  {tab.label}
                </motion.span>
              )}
              {tab.badge && !collapsed && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {tab.badge}
                </span>
              )}
              {tab.badge && collapsed && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-primary" />
              )}
              {isActive && (
                <motion.div
                  layoutId="sidebar-tab-indicator"
                  className="absolute inset-0 rounded-md border border-zinc-700"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {activeTab === 'nodes' && (
                <NodePalette
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  customTemplates={customNodeTemplates}
                />
              )}
              {activeTab === 'properties' && (
                <PropertiesPanel
                  selectedNode={selectedNode}
                  onUpdateNode={onUpdateNode}
                  onDeleteNode={onDeleteNode}
                />
              )}
              {activeTab === 'settings' && (
                <WorkflowSettings
                  workflow={workflow}
                  onUpdate={onUpdateWorkflow}
                />
              )}
              {activeTab === 'history' && (
                <HistoryPanel />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed State Content */}
        {collapsed && (
          <div className="flex flex-col items-center gap-2 p-2 mt-2">
            <CollapsedTabHint tab={activeTab} />
          </div>
        )}
      </div>

      {/* Footer */}
      {!collapsed && (
        <div className="shrink-0 px-3 py-2 border-t border-zinc-800 bg-zinc-950/80">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              {workflow?.status === 'published' ? 'Published' : 'Draft'}
            </span>
            <span className="text-xs text-zinc-600">
              v{workflow?.createdAt ? '1.0' : '0.0'}
            </span>
          </div>
        </div>
      )}
    </motion.aside>
  );
}

// Collapsed tab hint
function CollapsedTabHint({ tab }: { tab: SidebarTab }) {
  const hints: Record<SidebarTab, string> = {
    nodes: 'Drag nodes',
    properties: 'Select node',
    settings: 'Workflow',
    history: 'View history',
  };

  return (
    <div className="writing-mode-vertical text-xs text-zinc-600 py-4">
      <span className="rotate-180" style={{ writingMode: 'vertical-rl' }}>
        {hints[tab]}
      </span>
    </div>
  );
}

// Placeholder History Panel
function HistoryPanel() {
  const mockHistory = [
    { id: '1', action: 'Added Action node', time: '2 min ago' },
    { id: '2', action: 'Connected Start to Action', time: '3 min ago' },
    { id: '3', action: 'Updated node label', time: '5 min ago' },
    { id: '4', action: 'Created workflow', time: '10 min ago' },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-zinc-800">
        <h3 className="text-sm font-medium text-zinc-200">History</h3>
        <p className="text-xs text-zinc-500 mt-0.5">Recent changes to your workflow</p>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        <div className="p-2 space-y-1">
          {mockHistory.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors group"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 mt-0.5 shrink-0">
                <History className="h-3 w-3 text-zinc-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-300 truncate">{item.action}</p>
                <p className="text-xs text-zinc-500">{item.time}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Undo
              </Button>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="p-3 border-t border-zinc-800">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-zinc-500 hover:text-zinc-300"
        >
          View All History
        </Button>
      </div>
    </div>
  );
}

export default Sidebar;
