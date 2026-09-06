import { Chip } from "@/components/ui";
import type { DisplayStatus } from "@/lib/format";

const STATUS_STYLES: Record<
  DisplayStatus,
  { color: "success" | "warning" | "default"; variant: "primary" | "soft" }
> = {
  not_started: { color: "warning", variant: "primary" },
  ongoing: { color: "success", variant: "primary" },
  finished: { color: "default", variant: "soft" },
};

const LABELS: Record<DisplayStatus, string> = {
  not_started: "Not Started",
  ongoing: "Ongoing",
  finished: "Finished",
};

export function StatusBadge({ status }: { status: DisplayStatus }) {
  return (
    <Chip
      size="sm"
      color={STATUS_STYLES[status].color}
      variant={STATUS_STYLES[status].variant}
    >
      {LABELS[status]}
    </Chip>
  );
}
