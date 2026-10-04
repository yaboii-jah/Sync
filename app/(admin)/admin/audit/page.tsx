import { Card, Separator, Typography } from "@/components/ui/static";
import { ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAdminAudit } from "@/lib/supabase/queries/admin";
import { formatRelativeTime } from "@/lib/format";
import { EmptyState } from "@/components/empty-states";

export default async function AdminAuditPage() {
  const supabase = await createClient();
  const entries = await getAdminAudit(supabase, 200);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-10 lg:py-10">
      <Typography.Heading level={1} className="text-2xl">
        Mutation audit
      </Typography.Heading>
      <Typography type="body-sm" color="muted" className="mt-2 max-w-2xl">
        Notification sends, program controls, and admin access changes are
        recorded in the same database transaction as the change.
      </Typography>

      <Card className="mt-8">
        {entries.map((entry, index) => (
          <div key={entry.id}>
            {index > 0 ? <Separator /> : null}
            <article className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Typography type="body-sm" weight="semibold">
                    {entry.action.replaceAll(".", " ")}
                  </Typography>
                  <Typography type="body-xs" color="muted" className="mt-1">
                    {entry.actor_name}, {entry.entity_type}
                  </Typography>
                </div>
                <Typography type="body-xs" color="muted">
                  <time dateTime={entry.created_at}>
                    {formatRelativeTime(entry.created_at)}
                  </time>
                </Typography>
              </div>

              {entry.details && typeof entry.details === "object" ? (
                <pre className="bg-surface-secondary text-muted mt-3 overflow-x-auto rounded-lg px-3 py-2 font-mono text-xs whitespace-pre-wrap">
                  {JSON.stringify(entry.details, null, 2)}
                </pre>
              ) : null}
            </article>
          </div>
        ))}

        {entries.length === 0 ? (
          <EmptyState
            icon={<ClipboardList />}
            title="No admin mutations recorded"
            description="Sends and live-session controls will appear here."
          />
        ) : null}
      </Card>
    </div>
  );
}
