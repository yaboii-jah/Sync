import { requirePlatformSuperAdmin } from "@/lib/supabase/platform-admin-auth";
import { listPlatformAudit } from "@/lib/supabase/queries/platform-admin";

export default async function PlatformAuditPage({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  const query = await searchParams; const cursor = query.cursor && /^\d+$/.test(query.cursor) ? Number(query.cursor) : null; const { supabase } = await requirePlatformSuperAdmin(); const result = await listPlatformAudit(supabase,cursor); const rows = result.slice(0,25); const next = result.length > 25 ? result[24] : null;
  return <div className="platform-frame py-10"><p className="platform-kicker">Immutable record</p><h1 className="platform-display mt-3">Platform audit</h1><ul className="mt-8">{rows.map((row) => <li key={row.id} className="border-t py-5 platform-rule"><p className="font-semibold">{row.action}</p><p className="mt-1 text-sm text-muted">{row.actor_name || "Unknown operator"}{row.event_name ? ` · ${row.event_name}` : ""} · {new Date(row.created_at).toLocaleString()}</p><pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs text-muted">{JSON.stringify(row.details, null, 2)}</pre></li>)}</ul>{!rows.length ? <p className="mt-8 text-muted">No platform operations have been recorded.</p> : null}{next ? <Link className="platform-button mt-7" href={`/super-admin/audit?cursor=${next.id}`}>Next page</Link> : null}</div>;
}
import Link from "next/link";
