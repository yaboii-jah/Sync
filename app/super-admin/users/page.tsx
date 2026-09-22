import Link from "next/link";
import { requirePlatformSuperAdmin } from "@/lib/supabase/platform-admin-auth";
import { listPlatformUsers } from "@/lib/supabase/queries/platform-admin";

export default async function PlatformUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; cursorAt?: string; cursorId?: string }> }) {
  const query = await searchParams; const { supabase } = await requirePlatformSuperAdmin(); const rows = await listPlatformUsers(supabase, { search: query.q, cursorAt: query.cursorAt, cursorId: query.cursorId }); const users = rows.slice(0,25); const next = rows.length > 25 ? rows[24] : null;
  const nextParams = new URLSearchParams(); if (query.q) nextParams.set("q",query.q); if (next) { nextParams.set("cursorAt",next.created_at); nextParams.set("cursorId",next.id); }
  return <div className="platform-frame py-10"><p className="platform-kicker">Global identity</p><h1 className="platform-display mt-3">Users</h1><p className="mt-3 max-w-2xl text-muted">Review global accounts and aggregate event footprint. Tenant attendee details remain hidden outside audited support.</p>
    <form className="mt-7 flex gap-3"><input className="organizer-input min-w-0 flex-1" name="q" defaultValue={query.q} placeholder="Search name or verified email" aria-label="Search users" /><button className="platform-button">Search</button></form>
    <ul className="mt-8">{users.map((user) => <li key={user.id} className="border-t py-5 platform-rule"><div className="flex flex-wrap justify-between gap-4"><div><Link href={`/super-admin/users/${user.id}`} className="text-lg font-semibold hover:underline">{user.name || "Unnamed user"}</Link><p className="mt-1 text-sm text-muted break-all">{user.email} · {user.email_verified ? "Verified" : "Unverified"}{user.is_super_admin ? " · Super admin" : ""}</p><p className="mt-1 text-xs text-muted">{user.owned_event_count} owned · {user.administered_event_count} administered · {user.attended_event_count} attended</p></div><Link className="platform-link" href={`/super-admin/users/${user.id}`}>Review quotas</Link></div></li>)}</ul>{next ? <Link className="platform-button mt-7" href={`/super-admin/users?${nextParams}`}>Next page</Link> : null}
  </div>;
}
