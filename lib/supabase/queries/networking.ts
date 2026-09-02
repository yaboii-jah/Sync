import { createClient } from "../server";
import {
  SOCIAL_NETWORKS,
  type SocialNetwork,
  type SocialProfileLink,
} from "@/lib/social-profiles";

export interface OwnerNetworkingCard {
  publicToken: string;
  isPublic: boolean;
  links: SocialProfileLink[];
}

export interface PublicNetworkingCard {
  name: string;
  photoUrl: string | null;
  links: SocialProfileLink[];
}

function isSocialNetwork(value: string): value is SocialNetwork {
  return SOCIAL_NETWORKS.some((network) => network === value);
}

function parseLinks(rows: Array<{ network: string | null; url: string | null }>) {
  return rows.flatMap((row) =>
    row.network && row.url && isSocialNetwork(row.network)
      ? [{ network: row.network, url: row.url }]
      : [],
  );
}

export async function getOwnerNetworkingCard(): Promise<OwnerNetworkingCard> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_own_networking_card");

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const card = rows[0];
  if (!card) throw new Error("Networking card not found");

  return {
    publicToken: card.public_token,
    isPublic: card.is_public,
    links: parseLinks(rows),
  };
}

export async function getPublicNetworkingCard(
  token: string,
): Promise<PublicNetworkingCard | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_networking_card", {
    card_token: token,
  });

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const card = rows[0];
  if (!card) return null;

  return {
    name: card.name,
    photoUrl: card.photo_url,
    links: parseLinks(rows),
  };
}
