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

  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    // Self-heal: the on_auth_user_created trigger should normally create this
    // row, but it only fires on auth.users INSERT. If the profile is missing
    // (trigger not deployed, or the row was deleted while the user remains),
    // create it now so the app never hard-loops between /home and /login.
    await supabase.from("profiles").upsert({
      id: user.id,
      name: user.user_metadata?.name ?? "",
      photo_url:
        user.user_metadata?.picture ?? user.user_metadata?.avatar_url ?? null,
    });

    const { data: created } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    profile = created;
  }

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
