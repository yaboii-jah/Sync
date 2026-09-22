import Link from "next/link";
import { notFound } from "next/navigation";
import { QuotaForm } from "@/components/platform-admin/operation-forms";
import { requirePlatformSuperAdmin } from "@/lib/supabase/platform-admin-auth";
import { getPlatformUser } from "@/lib/supabase/queries/platform-admin";

export default async function PlatformUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { supabase } = await requirePlatformSuperAdmin(); const user = await getPlatformUser(supabase, id); if (!user) notFound();
  return <div className="platform-frame py-10"><Link className="platform-link" href="/super-admin/users">← Users</Link><p className="platform-kicker mt-8">Global account</p><h1 className="platform-display mt-3">{user.name || "Unnamed user"}</h1><p className="mt-3 text-muted break-all">{user.email} · {user.email_verified ? "Verified" : "Unverified"}{user.is_super_admin ? " · Active platform super admin" : ""}</p>
    <dl className="mt-8 grid gap-px overflow-hidden rounded-2xl border platform-rule sm:grid-cols-4">{[["Owned events",user.owned_event_count],["Admin roles",user.administered_event_count],["Attendee roles",user.attended_event_count],["Joined Sync",new Date(user.created_at).toLocaleDateString()]].map(([label,val]) => <div className="bg-surface p-4" key={label}><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 font-semibold">{val}</dd></div>)}</dl>
    <section className="mt-12 border-t pt-8 platform-rule"><h2 className="text-2xl font-semibold">Quota override</h2><p className="my-4 max-w-2xl text-muted">Blank fields use platform defaults. Clearing every field removes the override record.</p><QuotaForm userId={user.id} quota={user} /></section>
  </div>;
}
