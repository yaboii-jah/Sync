import "server-only";
import { notFound } from "next/navigation";
import { isMultiTenantPlatformEnabled } from "@/lib/feature-flags";
import { requireCompleteProfile } from "./profile";
import { createClient } from "./server";
import { getEventAccessBySlug } from "./queries/events";

/** Every data-access/action leaf calls this; layout checks are only presentation. */
export async function requireEventManager(slug: string) {
  if (!isMultiTenantPlatformEnabled()) notFound();
  const { user } = await requireCompleteProfile();
  const supabase = await createClient();
  const access = await getEventAccessBySlug(supabase, user.id, slug);
  if (!access || access.event.membershipStatus !== "active" ||
      (access.event.role !== "owner" && access.event.role !== "admin")) notFound();
  return { user, supabase, ...access };
}
