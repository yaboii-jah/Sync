import { createClient } from "@/lib/supabase/server";
import { getAdminAudit } from "@/lib/supabase/queries/admin";
import { formatRelativeTime } from "@/lib/format";

export default async function AdminAuditPage() {
  const supabase = await createClient();
  const entries = await getAdminAudit(supabase, 200);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-10 lg:py-10">
      <p className="text-xs font-bold tracking-[0.24em] text-pastel-yellow uppercase">Immutable record</p>
      <h1 className="mt-2 font-display text-4xl text-text-primary uppercase">Mutation audit</h1>
      <p className="mt-3 max-w-2xl text-sm text-text-muted">Every notification send and live-session control is recorded in the same database transaction as the change.</p>

      <div className="mt-8 overflow-hidden rounded-2xl border border-border-default">
        {entries.map((entry, index) => (
          <article key={entry.id} className={`px-4 py-4 sm:px-5 ${index > 0 ? "border-t border-border-default" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-bold text-text-primary">{entry.action.replaceAll(".", " ")}</p>
                <p className="mt-1 text-xs text-text-muted">{entry.actor_name} · {entry.entity_type}</p>
              </div>
              <time className="text-xs text-text-muted" dateTime={entry.created_at}>{formatRelativeTime(entry.created_at)}</time>
            </div>
            {entry.details && typeof entry.details === "object" ? (
              <pre className="mt-3 overflow-x-auto rounded-lg bg-accent-primary/20 px-3 py-2 text-xs whitespace-pre-wrap text-text-muted">
                {JSON.stringify(entry.details, null, 2)}
              </pre>
            ) : null}
          </article>
        ))}
        {entries.length === 0 ? <p className="px-5 py-10 text-center text-sm text-text-muted">No admin mutations recorded.</p> : null}
      </div>
    </div>
  );
}
