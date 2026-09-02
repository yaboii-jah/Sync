"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isValidPlatformUrl, type SocialPlatform } from "@/lib/platforms";

export interface SaveSocialProfileState {
  error: string | null;
  success: boolean;
}

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

  if (!isValidPlatformUrl(network as SocialPlatform, url)) {
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

  const { error } = await supabase
    .from("social_profiles")
    .upsert(
      { user_id: user.id, network, url },
      { onConflict: "user_id,network" },
    );

  if (error) {
    return { error: "Could not save your social profile. Please try again.", success: false };
  }

  revalidatePath("/connect");

  return { error: null, success: true };
}