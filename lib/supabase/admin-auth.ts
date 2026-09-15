import { redirect } from "next/navigation";
import { isAdmin } from "./queries/admin";
import { getRequestAuth } from "./request-auth";
import { isMultiTenantPlatformEnabled } from "@/lib/feature-flags";

export async function currentUserIsAdmin(): Promise<boolean> {
  if (isMultiTenantPlatformEnabled()) return false;
  const { supabase, claims } = await getRequestAuth();
  if (!claims) return false;

  try {
    return await isAdmin(supabase);
  } catch {
    return false;
  }
}

export async function requireAdmin(): Promise<void> {
  // Stale legacy action IDs must not retain global powers after route cutover.
  if (isMultiTenantPlatformEnabled()) redirect("/events");
  const { supabase, claims } = await getRequestAuth();
  if (!claims) redirect("/");
  if (!(await isAdmin(supabase))) redirect("/home");
}
