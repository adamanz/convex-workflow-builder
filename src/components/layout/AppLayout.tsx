import { ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showSidebar?: boolean;
  headerActions?: ReactNode;
}

export function AppLayout({
  children,
  title,
  subtitle,
  showSidebar = true,
  headerActions,
}: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {showSidebar && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{
              width: sidebarCollapsed ? 64 : 256,
              opacity: 1
            }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="flex-shrink-0"
          >
            <Sidebar
              collapsed={sidebarCollapsed}
              onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <Header
          title={title}
          subtitle={subtitle}
          actions={headerActions}
        />

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

/**
 * Full-screen layout without header/sidebar (for editor)
 */
interface FullScreenLayoutProps {
  children: ReactNode;
  className?: string;
}

export function FullScreenLayout({ children, className }: FullScreenLayoutProps) {
  return (
    <div className={cn("h-screen bg-background overflow-hidden", className)}>
      {children}
    </div>
  );
}

export default AppLayout;
