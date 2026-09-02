import { createClient } from "../server";

/**
 * The card shown to whoever scans an attendee's networking QR.
 *
 * Deliberately three fields. The QR encodes a Sync URL rather than a LinkedIn
 * one, so the scan resolves inside the app — which is what lets the code exist
 * from first sign-in with nothing typed. `name` and `photo_url` both arrive
 * from the LinkedIn sign-in itself, so a card is always complete;
 * `linkedin_url` is optional and only decides whether the card can offer a
 * direct profile link.
 */
export interface ScanProfile {
  id: string;
  name: string;
  photo_url: string | null;
  linkedin_url: string | null;
}

/**
 * Reads another attendee's scan card through `get_scan_profile`.
 *
 * The RPC is `security definer` because `profiles` is own-row read only — see
 * the migration for why a widened SELECT policy was the wrong tool. Returns
 * null for an unknown id rather than throwing, so a stale or mistyped QR renders
 * a "not found" card instead of a 500.
 *
 * The cast is here because `database.types.ts` is generated and must not be
 * hand-edited (ai-workflow-rules.md § Protected Files); it will type itself
 * once the types are regenerated from the schema with the Supabase CLI.
 */
export async function getScanProfile(
  profileId: string,
): Promise<ScanProfile | null> {
  const supabase = await createClient();

  const client = supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, string>,
    ) => Promise<{ data: ScanProfile[] | null; error: unknown }>;
  };

  const { data, error } = await client.rpc("get_scan_profile", {
    profile_id: profileId,
  });

  if (error || !data || data.length === 0) return null;

  return data[0];
}
