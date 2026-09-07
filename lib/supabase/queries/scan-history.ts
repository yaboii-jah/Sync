import { createClient } from "../server";

export interface NetworkingScanHistoryEntry {
  name: string;
  photoUrl: string | null;
  cardPath: string;
  scannedAt: string;
}

type NetworkingScanHistoryRow = {
  name: string;
  photo_url: string | null;
  card_path: string;
  scanned_at: string;
};

type NetworkingScanHistoryRpc = {
  rpc(
    functionName: "get_my_networking_scan_history",
  ): Promise<{ data: NetworkingScanHistoryRow[] | null; error: unknown }>;
  rpc(
    functionName: "record_networking_card_scan",
    args: { card_token: string },
  ): Promise<{ data: null; error: unknown }>;
};

/*
 * The generated database types describe the currently linked schema. This
 * narrow boundary keeps the new RPCs typed without hand-editing that generated
 * file; regenerate it after this migration is applied to the linked project.
 */
function scanHistoryRpc(client: Awaited<ReturnType<typeof createClient>>) {
  return client as unknown as NetworkingScanHistoryRpc;
}

export async function getMyNetworkingScanHistory(): Promise<NetworkingScanHistoryEntry[]> {
  const supabase = await createClient();
  const { data, error } = await scanHistoryRpc(supabase).rpc(
    "get_my_networking_scan_history",
  );
  if (error) {
    // Deployments can roll out the app before this migration. Keep Connect
    // usable while the database catches up, without hiding other failures.
    if (isMissingNetworkingScanHistoryRpc(error)) return [];
    throw error;
  }

  return (data ?? []).map((scan) => ({
    name: scan.name,
    photoUrl: scan.photo_url,
    cardPath: scan.card_path,
    scannedAt: scan.scanned_at,
  }));
}

export function isMissingNetworkingScanHistoryRpc(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "PGRST202"
  );
}

export async function recordNetworkingCardScan(cardToken: string): Promise<void> {
  if (!isNetworkingCardToken(cardToken)) return;

  const supabase = await createClient();
  const { error } = await scanHistoryRpc(supabase).rpc(
    "record_networking_card_scan",
    { card_token: cardToken },
  );
  if (error) throw error;
}

function isNetworkingCardToken(token: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
}
