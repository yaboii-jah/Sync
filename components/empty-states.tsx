import type { ReactNode } from "react";
import { Typography } from "@heroui/react";

interface EmptyStateProps {
  /** A stroke icon, sized by the caller-agnostic wrapper below. */
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * One empty state for the whole app. Icon, one line of what is missing, one
 * line of what to do about it, and an optional action.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span
        aria-hidden
        className="bg-surface-secondary text-muted flex size-12 items-center justify-center rounded-full [&>svg]:size-5"
      >
        {icon}
      </span>
      <Typography type="h6" className="mt-4">
        {title}
      </Typography>
      {description ? (
        <Typography type="body-sm" color="muted" className="mt-1 max-w-xs">
          {description}
        </Typography>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
