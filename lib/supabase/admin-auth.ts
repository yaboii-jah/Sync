import { redirect } from "next/navigation";
import { createClient } from "./server";
import { getAuthenticatedClaims } from "./auth";
import { isAdmin } from "./queries/admin";

export async function currentUserIsAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const claims = await getAuthenticatedClaims(supabase);
  if (!claims) return false;

  try {
    return await isAdmin(supabase);
  } catch {
    return false;
  }
}

export async function requireAdmin(): Promise<void> {
  const supabase = await createClient();
  const claims = await getAuthenticatedClaims(supabase);
  if (!claims) redirect("/");
  if (!(await isAdmin(supabase))) redirect("/home");
}
