import { createClient } from "../server";
import { SOCIAL_NETWORKS, type SocialLinks, type SocialNetwork } from "@/lib/social";

export type NetworkCardTemplate = 1 | 2 | 3 | 4;

export interface OwnNetworkingCard {
  publicToken: string;
  links: SocialLinks;
  template: NetworkCardTemplate;
}

export interface PublicNetworkingCard {
  name: string;
  photoUrl: string | null;
  links: SocialLinks;
  template: NetworkCardTemplate;
}

function collectLinks(rows: { network: string | null; url: string | null }[]): SocialLinks {
  const links: SocialLinks = {};
  for (const row of rows) {
    if (!row.network || !row.url) continue;
    if (!SOCIAL_NETWORKS.includes(row.network as SocialNetwork)) continue;
    links[row.network as SocialNetwork] = row.url;
  }
  return links;
}

function collectTemplate(rows: { templates?: number | null }[]): NetworkCardTemplate {
  for (const row of rows) {
    const t = row.templates;
    if (t === 1 || t === 2 || t === 3 || t === 4) return t;
  }
  return 1;
}

export async function getOwnNetworkingCard(): Promise<OwnNetworkingCard | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_own_networking_card");
  if (error) throw error;
  if (!data || data.length === 0) return null;
  return {
    publicToken: data[0].public_token,
    links: collectLinks(data),
    template: collectTemplate(data as unknown as { templates: number | null }[]),
  };
}

export async function getPublicNetworkingCard(token: string): Promise<PublicNetworkingCard | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_networking_card", { card_token: token });
  if (error) throw error;
  if (!data || data.length === 0) return null;
  return {
    name: data[0].name,
    photoUrl: data[0].photo_url,
    links: collectLinks(data),
    template: collectTemplate(data as unknown as { templates: number | null }[]),
  };
}
