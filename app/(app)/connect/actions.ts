"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isVerifiedGoogleUser } from "@/lib/supabase/auth-user";
import {
  SOCIAL_NETWORK_LABELS,
  SOCIAL_NETWORKS,
  normalizeSocialProfileUrl,
  type SocialNetwork,
} from "@/lib/social-profiles";

export interface NetworkingActionState {
  error: string | null;
  field: SocialNetwork | null;
  success: string | null;
}

async function authenticatedRpcClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isVerifiedGoogleUser(user)) redirect("/");
  return supabase;
}

export async function saveSocialProfiles(
  _previousState: NetworkingActionState,
  formData: FormData,
): Promise<NetworkingActionState> {
  const links: Partial<Record<SocialNetwork, string | null>> = {};

  for (const network of SOCIAL_NETWORKS) {
    const value = formData.get(network);
    const input = typeof value === "string" ? value.trim() : "";
    const normalized = input ? normalizeSocialProfileUrl(network, input) : null;

    if (input && !normalized) {
      return {
        error: `Enter a valid personal ${SOCIAL_NETWORK_LABELS[network]} profile URL or handle.`,
        field: network,
        success: null,
      };
    }
    links[network] = normalized;
  }

  const client = await authenticatedRpcClient();
  const { error } = await client.rpc("save_social_profiles", {
    linkedin_url: links.linkedin ?? "",
    instagram_url: links.instagram ?? "",
    facebook_url: links.facebook ?? "",
  });

  if (error) {
    return {
      error: "Could not save your social profiles. Try again.",
      field: null,
      success: null,
    };
  }

  revalidatePath("/connect");
  return { error: null, field: null, success: "Social profiles saved." };
}

export async function setNetworkingCardVisibility(
  _previousState: NetworkingActionState,
  formData: FormData,
): Promise<NetworkingActionState> {
  const published = formData.get("published") === "true";
  const client = await authenticatedRpcClient();
  const { error } = await client.rpc("set_networking_card_public", { published });

  if (error) {
    return {
      error: published
        ? "Add at least one social profile before publishing your card."
        : "Could not disable your public card. Try again.",
      field: null,
      success: null,
    };
  }

  revalidatePath("/connect");
  return {
    error: null,
    field: null,
    success: published ? "Your card is now public." : "Your public card is disabled.",
  };
}
