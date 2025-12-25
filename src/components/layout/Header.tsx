import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Search, Bell, Command } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  showSearch?: boolean;
  className?: string;
}

export function Header({
  title,
  subtitle,
  actions,
  showSearch = true,
  className,
}: HeaderProps) {
  return (
    <header className={cn(
      "h-14 flex-shrink-0 border-b border-border bg-card/50 backdrop-blur-sm",
      className
    )}>
      <div className="h-full px-4 flex items-center justify-between gap-4">
        {/* Title section */}
        <div className="flex items-center gap-4 min-w-0">
          {title && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="min-w-0"
            >
              <h1 className="text-lg font-semibold text-foreground truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground truncate">
                  {subtitle}
                </p>
              )}
            </motion.div>
          )}
        </div>

        {/* Search & actions */}
        <div className="flex items-center gap-3">
          {showSearch && (
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="w-64 pl-9 pr-12 bg-background/50"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <Command className="w-3 h-3 inline-block mr-0.5" />K
              </kbd>
            </div>
          )}

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
          </Button>

          {/* Custom actions */}
          {actions}
        </div>
      </div>
    </header>
  );
}

/**
 * Editor toolbar header with workflow-specific actions
 */
interface EditorHeaderProps {
  workflowName: string;
  isDirty?: boolean;
  onSave?: () => void;
  onRun?: () => void;
  isSaving?: boolean;
  isRunning?: boolean;
  actions?: ReactNode;
}

export function EditorHeader({
  workflowName,
  isDirty = false,
  onSave,
  onRun,
  isSaving = false,
  isRunning = false,
  actions,
}: EditorHeaderProps) {
  return (
    <header className="h-12 flex-shrink-0 border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="h-full px-4 flex items-center justify-between gap-4">
        {/* Workflow name */}
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-sm font-medium text-foreground truncate">
            {workflowName}
          </h1>
          {isDirty && (
            <span className="w-2 h-2 rounded-full bg-warning flex-shrink-0" title="Unsaved changes" />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {actions}

          {onSave && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSave}
              disabled={isSaving || !isDirty}
            >
              {isSaving ? 'Saving...' : 'Save'}
              <kbd className="ml-2 hidden sm:inline">
                <Command className="w-3 h-3 inline-block" />S
              </kbd>
            </Button>
          )}

          {onRun && (
            <Button
              size="sm"
              onClick={onRun}
              disabled={isRunning || isDirty}
            >
              {isRunning ? 'Running...' : 'Run'}
              <kbd className="ml-2 hidden sm:inline">
                <Command className="w-3 h-3 inline-block" />R
              </kbd>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
