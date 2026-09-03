"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  SOCIAL_NETWORKS,
  normalizeSocialUrl,
  SOCIAL_SPECS,
  type SocialLinks,
} from "@/lib/social";

export interface UpdateProfileState {
  error: string | null;
  success: boolean;
}

/**
 * Saves the attendee's display name and their networking links together.
 *
 * The two halves land in different places — `profiles.name` under own-row RLS,
 * the links through `save_social_profiles` — but they are one form to the
 * attendee, so a single action keeps one submit and one error surface.
 *
 * Every link is optional. `save_social_profiles` replaces the whole set, so the
 * form always posts all supported fields: an emptied field is a removal, and
 * clearing the last one unpublishes the card in the same statement.
 */
export async function updateProfile(
  _prevState: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const rawName = formData.get("name");
  const name = typeof rawName === "string" ? rawName.trim() : "";

  if (!name) return { error: "Your name can't be empty.", success: false };

  const links: SocialLinks = {};

  for (const network of SOCIAL_NETWORKS) {
    const raw = formData.get(network);
    const value = typeof raw === "string" ? raw.trim() : "";

    if (!value) continue;

    const normalized = normalizeSocialUrl(network, value);

    if (!normalized) {
      return {
        error: `That does not look like a ${SOCIAL_SPECS[network].label} profile link. Try ${SOCIAL_SPECS[network].placeholder}`,
        success: false,
      };
    }

    links[network] = normalized;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error: nameError } = await supabase
    .from("profiles")
    .update({ name })
    .eq("id", user.id);

  if (nameError) {
    return { error: "Could not save your profile. Please try again.", success: false };
  }

  const { error: linksError } = await supabase.rpc("save_social_profiles", {
    linkedin_url: links.linkedin ?? "",
    instagram_url: links.instagram ?? "",
    facebook_url: links.facebook ?? "",
    github_url: links.github ?? "",
  });

  if (linksError) {
    return { error: "Could not save your links. Please try again.", success: false };
  }

  revalidatePath("/home");
  revalidatePath("/connect");
  revalidatePath("/settings");
  revalidatePath("/more");

  return { error: null, success: true };
}
