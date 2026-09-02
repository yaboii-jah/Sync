"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOwnNetworkingCard } from "@/lib/supabase/queries/networking";
import { normalizeSocialUrl, type SocialNetwork } from "@/lib/social";

export interface SaveSocialProfileState {
  error: string | null;
  success: boolean;
}

/**
 * Saves one platform's profile URL.
 *
 * The write goes through `save_social_profiles` rather than a direct upsert:
 * `social_profiles` has no INSERT, UPDATE or DELETE grant for `authenticated`
 * (migration `20260901162556`), so a direct write is refused by the database.
 * The RPC additionally requires a Google identity.
 *
 * That RPC replaces the whole set, so the other two links are read back and
 * re-sent. Sending only the edited one would silently drop the others.
 */
export async function saveSocialProfile(
  _prevState: SaveSocialProfileState,
  formData: FormData,
): Promise<SaveSocialProfileState> {
  const rawNetwork = formData.get("network");
  const rawUrl = formData.get("url");
  const network = typeof rawNetwork === "string" ? rawNetwork.trim() : "";
  const url = typeof rawUrl === "string" ? rawUrl.trim() : "";

  if (!network || !["linkedin", "instagram", "facebook"].includes(network)) {
    return { error: "Invalid network.", success: false };
  }

  if (!url) {
    return { error: "URL cannot be empty.", success: false };
  }

  /*
   * `lib/platforms.ts` validates loosely for the field's own message; the
   * column's check constraint accepts exactly one URL shape per network, so
   * the value is reduced to that shape here before it is sent. A link that
   * cannot be reduced is rejected with a message rather than as a constraint
   * violation.
   */
  const normalized = normalizeSocialUrl(network as SocialNetwork, url);

  if (!normalized) {
    return {
      error: `Enter a valid ${network} profile URL.`,
      success: false,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const card = await getOwnNetworkingCard();
  const links = { ...card?.links, [network]: normalized };

  const { error } = await supabase.rpc("save_social_profiles", {
    linkedin_url: links.linkedin ?? "",
    instagram_url: links.instagram ?? "",
    facebook_url: links.facebook ?? "",
  });

  if (error) {
    return { error: "Could not save your social profile. Please try again.", success: false };
  }

  revalidatePath("/connect");
  revalidatePath("/settings");

  return { error: null, success: true };
}
