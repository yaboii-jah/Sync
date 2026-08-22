import type { DisplayStatus } from "@/lib/format";

const BADGE_STYLES: Record<DisplayStatus, string> = {
  not_started: "border border-text-muted/50 text-text-muted",
  ongoing:
    "bg-state-success text-charcoal font-bold shadow-[0_0_12px_rgba(88,222,105,0.5)] animate-pulse",
  finished: "text-text-primary/45",
};

const LABELS: Record<DisplayStatus, string> = {
  not_started: "Not Started",
  ongoing: "Ongoing",
  finished: "Finished",
};

export function StatusBadge({ status }: { status: DisplayStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs ${BADGE_STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
