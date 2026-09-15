import { redirect } from "next/navigation";
import { isMultiTenantPlatformEnabled } from "@/lib/feature-flags";
import { legacyAdminDestination } from "@/lib/events/routing";
import { getRequestAuth } from "./request-auth";
import { getUserEvents } from "./queries/events";

/** Layouts and data leaves can run concurrently; both must retire global reads. */
export async function redirectLegacyAdmin(): Promise<void> {
  if (!isMultiTenantPlatformEnabled()) return;
  const { supabase, claims } = await getRequestAuth();
  if (!claims) redirect("/");
  redirect(legacyAdminDestination(await getUserEvents(supabase, claims.sub)));
}
