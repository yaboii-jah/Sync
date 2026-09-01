import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

export interface PingResult {
  ok: boolean;
  error: string | null;
}

/**
 * Ask Postgres one question, so the project registers a request.
 *
 * The client is anonymous — a scheduled call carries no session — and RLS
 * grants `anon` nothing, so this always returns zero rows. That is the expected
 * result, not a failure: PostgREST still authenticated the key, took a
 * connection, and ran the query with its policies applied, which is the traffic
 * an idle project is measured by. What this reads is `error` instead: a paused,
 * unreachable, or misconfigured project fails here; an answering one does not.
 *
 * `events` is the ping target because it is the smallest and most stable table
 * in the schema — one row, no churn.
 */
export async function pingDatabase(
  client: SupabaseClient<Database>,
): Promise<PingResult> {
  const { error } = await client.from("events").select("id").limit(1);

  return { ok: !error, error: error?.message ?? null };
}
