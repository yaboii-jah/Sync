import type { ReactNode } from "react";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse bg-accent-primary/30 ${className}`} />;
}

export function SkeletonText({ className = "" }: { className?: string }) {
  return <Skeleton className={`h-4 rounded-md ${className}`} />;
}

export function SkeletonCard({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border-default bg-bg-base px-4 py-4 ${className}`}>
      {children}
    </div>
  );
}
