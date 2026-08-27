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
  if (!result.profile.linkedin_url) redirect("/onboarding");

  return { user: result.user, profile: result.profile };
}
