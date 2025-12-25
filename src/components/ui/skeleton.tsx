import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Use shimmer animation instead of pulse */
  shimmer?: boolean;
}

function Skeleton({ className, shimmer = false, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted",
        shimmer ? "skeleton-shimmer" : "animate-pulse",
        className
      )}
      {...props}
    />
  );
}

// Common skeleton patterns
function SkeletonText({ className, lines = 3 }: { className?: string; lines?: number }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i === lines - 1 ? "w-3/4" : "w-full")}
        />
      ))}
    </div>
  );
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-4 space-y-4", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

function SkeletonAvatar({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  return (
    <Skeleton className={cn("rounded-full", sizeClasses[size], className)} />
  );
}

function SkeletonButton({ className, size = "default" }: { className?: string; size?: "sm" | "default" | "lg" }) {
  const sizeClasses = {
    sm: "h-8 w-20",
    default: "h-9 w-24",
    lg: "h-10 w-28",
  };

  return (
    <Skeleton className={cn("rounded-md", sizeClasses[size], className)} />
  );
}

function SkeletonInput({ className }: { className?: string }) {
  return (
    <Skeleton className={cn("h-9 w-full rounded-md", className)} />
  );
}

function SkeletonTable({
  rows = 5,
  columns = 4,
  className
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex gap-4 pb-2 border-b border-border">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

function SkeletonWorkflowNode({ className }: { className?: string }) {
  return (
    <div className={cn(
      "rounded-lg border border-border bg-card p-4 w-64 space-y-3",
      className
    )}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-4 flex-1" />
      </div>
      <Skeleton className="h-3 w-3/4" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
    </div>
  );
}

export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonInput,
  SkeletonTable,
  SkeletonWorkflowNode,
};
