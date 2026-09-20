import { TeamManager } from "@/components/manage/team-manager";
import { requireEventManager } from "@/lib/supabase/management-auth";
import { getManagedEventTeam } from "@/lib/supabase/queries/management";

export default async function TeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { event, permissions, supabase } = await requireEventManager((await params).slug);
  const team = event.isSuspended ? { members: [], invitations: [] } : await getManagedEventTeam(supabase, event.id);
  return <TeamManager slug={event.slug} eventName={event.name} members={team.members} invitations={team.invitations} readOnly={!permissions.canManageAdmins} />;
}
