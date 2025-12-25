import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from '@tanstack/react-router';
import {
  LayoutDashboard,
  Workflow,
  PlayCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  label: string;
  icon: typeof LayoutDashboard;
  href: string;
  badge?: string | number;
}

const mainNavItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { label: 'Workflows', icon: Workflow, href: '/workflows' },
  { label: 'Executions', icon: PlayCircle, href: '/executions' },
];

const bottomNavItems: NavItem[] = [
  { label: 'Settings', icon: Settings, href: '/settings' },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <TooltipProvider delayDuration={0}>
      <div className="h-full flex flex-col bg-card border-r border-border">
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-border">
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-semibold text-foreground">Workflow</span>
              </motion.div>
            )}
          </AnimatePresence>

          {collapsed && (
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
          )}
        </div>

        {/* Create button */}
        <div className="p-3">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" className="w-full" asChild>
                  <Link to="/workflows/new">
                    <PlusCircle className="w-4 h-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                Create Workflow
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button className="w-full justify-start gap-2" asChild>
              <Link to="/workflows/new">
                <PlusCircle className="w-4 h-4" />
                Create Workflow
              </Link>
            </Button>
          )}
        </div>

        <Separator />

        {/* Main navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {mainNavItems.map((item) => {
            const isActive = currentPath === item.href ||
              (item.href !== '/' && currentPath.startsWith(item.href));

            return (
              <NavItemComponent
                key={item.href}
                item={item}
                isActive={isActive}
                collapsed={collapsed}
              />
            );
          })}
        </nav>

        <Separator />

        {/* Bottom navigation */}
        <div className="p-3 space-y-1">
          {bottomNavItems.map((item) => {
            const isActive = currentPath === item.href;

            return (
              <NavItemComponent
                key={item.href}
                item={item}
                isActive={isActive}
                collapsed={collapsed}
              />
            );
          })}
        </div>

        {/* Collapse toggle */}
        <div className="p-3 border-t border-border">
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'default'}
            className={cn("w-full", !collapsed && "justify-start gap-2")}
            onClick={onToggle}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Collapse</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}

interface NavItemComponentProps {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}

function NavItemComponent({ item, isActive, collapsed }: NavItemComponentProps) {
  const Icon = item.icon;

  const content = (
    <Link
      to={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
        collapsed && "justify-center px-2"
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <AnimatePresence mode="wait">
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
      {!collapsed && item.badge && (
        <span className="ml-auto bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
          {item.badge}
        </span>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="right">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

export default Sidebar;
