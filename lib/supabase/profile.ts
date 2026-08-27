import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "./server";
import type { Tables } from "./database.types";

export type Profile = Tables<"profiles">;

export interface AuthenticatedProfile {
  user: User;
  profile: Profile | null;
}

export async function getAuthenticatedProfile(): Promise<AuthenticatedProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile };
}

export async function requireCompleteProfile(): Promise<{
  user: User;
  profile: Profile;
}> {
  const result = await getAuthenticatedProfile();

  if (!result || !result.profile) redirect("/login");
  /*
   * No LinkedIn-URL gate. The QR now resolves through `linkedInScanTarget`,
   * which falls back to a name search when the profile URL is absent, so the
   * whole app — including Connect — works from first sign-in with nothing
   * typed. `/onboarding` still exists and is still reachable from Settings for
   * anyone who wants the exact profile link instead of a name search.
   */

  return { user: result.user, profile: result.profile };
}
