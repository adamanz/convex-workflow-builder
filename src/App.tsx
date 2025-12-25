import { createRouter, RouterProvider, createRootRoute, createRoute, Outlet, Link, useParams, useNavigate } from "@tanstack/react-router";
import { Workflow, Home, Menu, X } from "lucide-react";
import { useState, createContext, useContext, useCallback } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dashboard, WorkflowEditor, ExecutionViewer } from "@/pages";

// =============================================================================
// Toast System
// =============================================================================

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = "info", duration = 5000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

function ToastContainer() {
  const { toasts, removeToast } = useToast();

  const typeStyles: Record<ToastType, string> = {
    success: "bg-success/20 border-success text-success",
    error: "bg-destructive/20 border-destructive text-destructive",
    warning: "bg-warning/20 border-warning text-warning",
    info: "bg-primary/20 border-primary text-primary",
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            className={cn(
              "px-4 py-3 rounded-lg border backdrop-blur-sm shadow-lg",
              "flex items-center justify-between gap-3",
              typeStyles[toast.type]
            )}
          >
            <p className="text-sm font-medium">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// Layout Components
// =============================================================================

function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 glass border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                <Workflow className="w-5 h-5 text-primary" />
              </div>
              <span className="font-semibold text-foreground hidden sm:block">
                Workflow Builder
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <Link to="/">
                {({ isActive }) => (
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-2"
                  >
                    <Home className="w-4 h-4" />
                    Dashboard
                  </Button>
                )}
              </Link>
            </nav>

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-foreground" />
              ) : (
                <Menu className="w-5 h-5 text-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-border/50 bg-card/95 backdrop-blur-sm"
            >
              <div className="container mx-auto px-4 py-3 flex flex-col gap-1">
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-foreground"
                >
                  <Home className="w-4 h-4" />
                  Dashboard
                </Link>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

// =============================================================================
// Page Components
// =============================================================================

function HomePage() {
  const navigate = useNavigate();

  const handleNavigateToEditor = (workflowId: string) => {
    navigate({ to: '/workflow/$id', params: { id: workflowId } });
  };

  const handleNavigateToExecution = (executionId: string) => {
    navigate({ to: '/execution/$id', params: { id: executionId } });
  };

  return (
    <Dashboard
      onNavigateToEditor={handleNavigateToEditor}
      onNavigateToExecution={handleNavigateToExecution}
    />
  );
}

function WorkflowPage() {
  const { id } = useParams({ from: "/workflow/$id" });
  const navigate = useNavigate();

  const handleBack = () => {
    navigate({ to: '/' });
  };

  return (
    <div className="h-[calc(100vh-3.5rem)]">
      <WorkflowEditor
        workflowId={id}
        onBack={handleBack}
      />
    </div>
  );
}

function ExecutionPage() {
  const { id } = useParams({ from: "/execution/$id" });
  const navigate = useNavigate();

  const handleBack = () => {
    navigate({ to: '/' });
  };

  const handleNavigateToEditor = (workflowId: string) => {
    navigate({ to: '/workflow/$id', params: { id: workflowId } });
  };

  return (
    <div className="h-[calc(100vh-3.5rem)]">
      <ExecutionViewer
        executionId={id}
        onBack={handleBack}
        onNavigateToEditor={handleNavigateToEditor}
      />
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
        <p className="text-lg text-muted-foreground">Page not found</p>
        <Link to="/">
          <Button variant="outline">
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}

// =============================================================================
// Router Setup
// =============================================================================

const rootRoute = createRootRoute({
  component: AppLayout,
  notFoundComponent: NotFoundPage,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const workflowRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workflow/$id",
  component: WorkflowPage,
});

const executionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/execution/$id",
  component: ExecutionPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  workflowRoute,
  executionRoute,
]);

const router = createRouter({ routeTree });

// Type augmentation for TanStack Router
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// =============================================================================
// Main App Component
// =============================================================================

function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  );
}

export default App;
