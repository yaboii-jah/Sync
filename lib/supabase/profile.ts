import { redirect } from "next/navigation";
import { createClient } from "./server";
import { getAuthenticatedClaims } from "./auth";
import type { Tables } from "./database.types";

export type Profile = Tables<"profiles">;

export interface AuthenticatedUser {
  id: string;
  user_metadata: Record<string, unknown>;
}

export interface AuthenticatedProfile {
  user: AuthenticatedUser;
  profile: Profile | null;
}

export async function getAuthenticatedProfile(): Promise<AuthenticatedProfile | null> {
  const supabase = await createClient();
  const claims = await getAuthenticatedClaims(supabase);
  if (!claims) return null;

  const user: AuthenticatedUser = {
    id: claims.sub,
    user_metadata: toMetadata(claims.user_metadata),
  };

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
      name: metadataString(user.user_metadata, "name") ?? "",
      photo_url:
        metadataString(user.user_metadata, "picture") ??
        metadataString(user.user_metadata, "avatar_url"),
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
  user: AuthenticatedUser;
  profile: Profile;
}> {
  const result = await getAuthenticatedProfile();

  if (!result) redirect("/");
  if (!result.profile) throw new Error("Authenticated profile recovery failed");
  /* Social links are optional. Connect always has a stable QR, and Settings
   * activates its card as soon as at least one link is saved. */

  return { user: result.user, profile: result.profile };
}

function toMetadata(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function metadataString(
  metadata: Record<string, unknown>,
  key: string,
): string | null {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
