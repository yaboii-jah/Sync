import "server-only";
import { notFound, redirect } from "next/navigation";
import { isMultiTenantPlatformEnabled } from "@/lib/feature-flags";
import { getRequestAuth } from "./request-auth";

/** Authorize every platform-operations page and action independently. */
export async function requirePlatformSuperAdmin() {
  if (!isMultiTenantPlatformEnabled()) notFound();
  const { supabase, claims } = await getRequestAuth();
  if (!claims) redirect("/?next=/super-admin");
  const { data, error } = await supabase
    .from("platform_super_admins")
    .select("user_id")
    .eq("user_id", claims.sub)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) notFound();
  return { supabase, userId: claims.sub };
}
