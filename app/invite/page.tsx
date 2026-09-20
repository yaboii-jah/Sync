import { notFound } from "next/navigation";
import { InviteAcceptance } from "@/components/manage/invite-acceptance";
import { isMultiTenantPlatformEnabled } from "@/lib/feature-flags";
import { getAuthenticatedClaims } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Event invitation · Sync", robots: { index: false, follow: false } };

export default async function InvitePage() {
  if (!isMultiTenantPlatformEnabled()) notFound();
  const signedIn = Boolean(await getAuthenticatedClaims(await createClient()));
  return <InviteAcceptance signedIn={signedIn} />;
}
