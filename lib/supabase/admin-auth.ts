import { redirect } from "next/navigation";
import { isAdmin } from "./queries/admin";
import { getRequestAuth } from "./request-auth";

export async function currentUserIsAdmin(): Promise<boolean> {
  const { supabase, claims } = await getRequestAuth();
  if (!claims) return false;

  try {
    return await isAdmin(supabase);
  } catch {
    return false;
  }
}

export async function requireAdmin(): Promise<void> {
  const { supabase, claims } = await getRequestAuth();
  if (!claims) redirect("/");
  if (!(await isAdmin(supabase))) redirect("/home");
}
