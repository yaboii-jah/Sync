import { redirect } from "next/navigation";
import { createClient } from "./server";
import { isAdmin } from "./queries/admin";
import { isVerifiedGoogleUser } from "./auth-user";

export async function currentUserIsAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isVerifiedGoogleUser(user)) return false;

  try {
    return await isAdmin(supabase);
  } catch {
    return false;
  }
}

export async function requireAdmin(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) redirect("/");
  if (!isVerifiedGoogleUser(user)) redirect("/");
  if (!(await isAdmin(supabase))) redirect("/home");
}
