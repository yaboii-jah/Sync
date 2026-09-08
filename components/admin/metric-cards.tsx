import type { LucideIcon } from "lucide-react";
import { Card, Typography } from "@/components/ui/static";

export interface AdminMetric {
  /** Short noun phrase naming what the number counts. */
  label: string;
  value: number;
  icon: LucideIcon;
}

/**
 * The admin console's KPI row.
 *
 * Shared by the Overview and the Attendees directory so one number reads the
 * same way in both places. The wide grid tracks the number of metrics, so three
 * cards fill the row instead of leaving an empty fourth column. Tailwind needs
 * whole class names at build time, which is why these are written out.
 */
const WIDE_COLUMNS: Record<number, string> = {
  1: "xl:grid-cols-1",
  2: "xl:grid-cols-2",
  3: "xl:grid-cols-3",
  4: "xl:grid-cols-4",
};

export function MetricCards({
  metrics,
  className = "",
}: {
  metrics: AdminMetric[];
  className?: string;
}) {
  const wide = WIDE_COLUMNS[metrics.length] ?? "xl:grid-cols-4";

  return (
    <section
      className={`grid gap-3 sm:grid-cols-2 ${wide} ${className}`.trim()}
    >
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card key={metric.label}>
            <Card.Content className="py-5">
              <div className="flex items-center justify-between gap-3">
                <Typography type="body-sm" color="muted">
                  {metric.label}
                </Typography>
                <Icon className="text-muted size-5" aria-hidden />
              </div>
              <p className="mt-3 text-3xl font-semibold tabular-nums">
                {metric.value}
              </p>
            </Card.Content>
          </Card>
        );
      })}
    </section>
  );
}
