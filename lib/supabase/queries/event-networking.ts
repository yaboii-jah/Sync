import { createClient } from "@/lib/supabase/server";
import { SOCIAL_NETWORKS, type SocialLinks, type SocialNetwork } from "@/lib/social";
import type { NetworkCardTemplate } from "./networking";

export interface EventNetworkingCard {
  token: string;
  template: NetworkCardTemplate;
  links: SocialLinks;
  available: SocialLinks;
}

export interface EventScannedAttendee {
  name: string;
  photoUrl: string | null;
  token: string | null;
}

type CardRow = { token: string; template: number; links: Record<string, string>; available: Record<string, string> };
type PublicCardRow = { name: string; photo_url: string | null; template: number; links: Record<string, string> };
type ScanRow = { name: string; photo_url: string | null; token: string | null };
type NetworkingRpc = {
  rpc(name: "get_my_event_networking_card", args: { target_event_id: string }): Promise<{ data: CardRow | null; error: unknown }>;
  rpc(name: "get_event_networking_card", args: { target_event_id: string; card_token: string }): Promise<{ data: PublicCardRow | null; error: unknown }>;
  rpc(name: "get_my_event_networking_scans", args: { target_event_id: string }): Promise<{ data: ScanRow[] | null; error: unknown }>;
  rpc(name: "record_event_networking_scan", args: { target_event_id: string; card_token: string }): Promise<{ error: unknown }>;
  rpc(name: "save_event_networking_card", args: { target_event_id: string; selected_networks: string[]; selected_template: number }): Promise<{ error: unknown }>;
};

async function client(): Promise<NetworkingRpc> {
  return await createClient() as unknown as NetworkingRpc;
}

function linksFrom(value: Record<string, string> | null | undefined): SocialLinks {
  const links: SocialLinks = {};
  for (const network of SOCIAL_NETWORKS) if (value?.[network]) links[network] = value[network];
  return links;
}

function templateFrom(value: number): NetworkCardTemplate {
  return value === 2 || value === 3 || value === 4 ? value : 1;
}

export async function getMyEventNetworkingCard(eventId: string): Promise<EventNetworkingCard | null> {
  const { data, error } = await (await client()).rpc("get_my_event_networking_card", { target_event_id: eventId });
  if (error) throw error;
  return data ? { token: data.token, template: templateFrom(data.template), links: linksFrom(data.links), available: linksFrom(data.available) } : null;
}

export async function getEventNetworkingCard(eventId: string, token: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) return null;
  const { data, error } = await (await client()).rpc("get_event_networking_card", { target_event_id: eventId, card_token: token });
  if (error) throw error;
  return data ? { name: data.name, photoUrl: data.photo_url, template: templateFrom(data.template), links: linksFrom(data.links) } : null;
}

export async function getMyEventNetworkingScans(eventId: string): Promise<EventScannedAttendee[]> {
  const { data, error } = await (await client()).rpc("get_my_event_networking_scans", { target_event_id: eventId });
  if (error) throw error;
  return (data ?? []).map((row) => ({ name: row.name, photoUrl: row.photo_url, token: row.token }));
}

export async function recordEventNetworkingScan(eventId: string, token: string): Promise<void> {
  const { error } = await (await client()).rpc("record_event_networking_scan", { target_event_id: eventId, card_token: token });
  if (error) throw error;
}

export async function saveEventNetworkingCard(eventId: string, networks: SocialNetwork[], template: NetworkCardTemplate): Promise<void> {
  const { error } = await (await client()).rpc("save_event_networking_card", {
    target_event_id: eventId, selected_networks: networks, selected_template: template,
  });
  if (error) throw error;
}

export async function saveEventReusableSocialLinks(eventId: string, links: SocialLinks): Promise<void> {
  const supabase = await createClient();
  const rpc = supabase as unknown as { rpc(name: "save_event_reusable_social_links", args: {
    target_event_id: string; linkedin_url: string; instagram_url: string; facebook_url: string; github_url: string;
  }): Promise<{ error: unknown }> };
  const { error } = await rpc.rpc("save_event_reusable_social_links", {
    target_event_id: eventId,
    linkedin_url: links.linkedin ?? "", instagram_url: links.instagram ?? "",
    facebook_url: links.facebook ?? "", github_url: links.github ?? "",
  });
  if (error) throw error;
}
