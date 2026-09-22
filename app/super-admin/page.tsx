import Link from "next/link";
import { requirePlatformSuperAdmin } from "@/lib/supabase/platform-admin-auth";
import { getPlatformOverview, listPlatformAudit } from "@/lib/supabase/queries/platform-admin";

export default async function PlatformAdminOverviewPage() {
  const { supabase } = await requirePlatformSuperAdmin();
  const [overview, audit] = await Promise.all([getPlatformOverview(supabase), listPlatformAudit(supabase)]);
  const metrics = [
    ["Users", overview.users], ["Events", overview.events], ["Published", overview.published_events],
    ["Suspended", overview.suspended_events], ["Live support", overview.active_support_sessions],
    ["Feedback · 7 days", overview.feedback_last_7_days], ["Failed invite email · 24h", overview.failed_invitation_emails_last_24_hours],
  ];
  return <div className="platform-frame py-10 sm:py-14"><p className="platform-kicker">Platform health</p><h1 className="platform-display mt-3">Operations overview</h1>
    <dl className="mt-8 grid gap-px overflow-hidden rounded-2xl border platform-rule sm:grid-cols-2 lg:grid-cols-4">{metrics.map(([label,count]) => <div key={label} className="bg-surface p-5"><dt className="text-sm text-muted">{label}</dt><dd className="mt-2 text-3xl font-bold">{count}</dd></div>)}</dl>
    <div className="mt-12 flex items-end justify-between gap-4"><div><p className="platform-kicker">Immutable trail</p><h2 className="mt-2 text-2xl font-semibold">Recent operations</h2></div><Link className="platform-link" href="/super-admin/audit">View audit</Link></div>
    <ul className="mt-5">{audit.slice(0, 8).map((row) => <li key={row.id} className="border-t py-4 platform-rule"><p className="font-semibold">{row.action}</p><p className="mt-1 text-sm text-muted">{row.actor_name || "Unknown operator"}{row.event_name ? ` · ${row.event_name}` : ""} · {new Date(row.created_at).toLocaleString()}</p></li>)}</ul>
  </div>;
}
