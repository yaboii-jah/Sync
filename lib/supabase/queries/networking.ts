import { createClient } from "../server";
import {
  SOCIAL_NETWORKS,
  type SocialLinks,
  type SocialNetwork,
} from "@/lib/social";

/** An attendee's own card: the QR's destination, plus whether it resolves. */
export interface OwnNetworkingCard {
  publicToken: string;
  isPublic: boolean;
  links: SocialLinks;
}

/** What a scanner sees. Never carries the token or the owner's id. */
export interface PublicNetworkingCard {
  name: string;
  photoUrl: string | null;
  links: SocialLinks;
}

/**
 * Folds the RPCs' one-row-per-link shape into a single card.
 *
 * Both functions left-join `social_profiles`, so an attendee with no links
 * still returns one row — with `network` and `url` null. The generated types
 * declare those columns non-null because a Postgres function's return type
 * carries no nullability, so the null case is filtered here rather than trusted
 * away.
 */
function collectLinks(
  rows: { network: string | null; url: string | null }[],
): SocialLinks {
  const links: SocialLinks = {};

  for (const row of rows) {
    if (!row.network || !row.url) continue;
    if (!SOCIAL_NETWORKS.includes(row.network as SocialNetwork)) continue;
    links[row.network as SocialNetwork] = row.url;
  }

  return links;
}

/**
 * Reads the signed-in attendee's own card.
 *
 * `security invoker` and own-row RLS, so this returns the caller's card or
 * nothing at all. Null means the card row is missing — every profile gets one
 * from a trigger, so in practice only a dev preview with no session sees it.
 */
export async function getOwnNetworkingCard(): Promise<OwnNetworkingCard | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_own_networking_card");

  if (error) throw error;
  if (!data || data.length === 0) return null;

  return {
    publicToken: data[0].public_token,
    isPublic: data[0].is_public,
    links: collectLinks(data),
  };
}

/**
 * Resolves a scanned card token.
 *
 * The token is a bearer credential: it identifies the card, and the RPC returns
 * rows only while its owner has published it. An unknown token, a withdrawn
 * card, and a card with no links are all the same empty result, so a stale QR
 * renders "card not found" instead of leaking that the token was once valid.
 */
export async function getPublicNetworkingCard(
  token: string,
): Promise<PublicNetworkingCard | null> {
  // A mistyped path reaches Postgres as a uuid cast error, which would surface
  // as a 500 rather than the not-found card the route already renders.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_networking_card", {
    card_token: token,
  });

  if (error) throw error;

  if (!data || data.length === 0) return null;

  return {
    name: data[0].name,
    photoUrl: data[0].photo_url,
    links: collectLinks(data),
  };
}
