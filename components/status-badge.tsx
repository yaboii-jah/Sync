import { Chip } from "@heroui/react";
import type { DisplayStatus } from "@/lib/format";

/**
 * Status is monochrome. It reads through fill weight, not hue:
 * ongoing is a solid ink chip, not started is a neutral chip, finished fades.
 */
const VARIANTS: Record<DisplayStatus, "primary" | "secondary" | "soft"> = {
  not_started: "secondary",
  ongoing: "primary",
  finished: "soft",
};

const LABELS: Record<DisplayStatus, string> = {
  not_started: "Not Started",
  ongoing: "Ongoing",
  finished: "Finished",
};

export function StatusBadge({ status }: { status: DisplayStatus }) {
  return (
    <Chip size="sm" variant={VARIANTS[status]}>
      {LABELS[status]}
    </Chip>
  );
}
