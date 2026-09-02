import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "./server";
import type { Tables } from "./database.types";
import { isVerifiedGoogleUser } from "./auth-user";

export type Profile = Tables<"profiles">;

export interface AuthenticatedProfile {
  user: User;
  profile: Profile | null;
}

export async function getAuthenticatedProfile(): Promise<AuthenticatedProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) return null;
  if (!isVerifiedGoogleUser(user)) return null;

  const profileResult = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileResult.error) throw profileResult.error;

  let profile = profileResult.data;

  if (!profile) {
    const { error: createError } = await supabase.from("profiles").upsert({
      id: user.id,
      name: user.user_metadata?.name ?? "",
      photo_url:
        user.user_metadata?.picture ?? user.user_metadata?.avatar_url ?? null,
    });

    if (createError) throw createError;

    const result = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (result.error) throw result.error;
    profile = result.data;
  }

  return { user, profile };
}

export async function requireCompleteProfile(): Promise<{
  user: User;
  profile: Profile;
}> {
  const result = await getAuthenticatedProfile();

  if (!result) redirect("/");
  if (!result.profile) throw new Error("Authenticated profile recovery failed");

  return { user: result.user, profile: result.profile };
}
