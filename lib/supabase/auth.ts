import {
  isAuthSessionMissingError,
  type JwtPayload,
  type SupabaseClient,
} from "@supabase/supabase-js";
import type { Database } from "./database.types";

type ServerSupabaseClient = SupabaseClient<Database>;

/** Use the same verified claim state for every server-side auth decision. */
export async function getAuthenticatedClaims(
  supabase: ServerSupabaseClient,
): Promise<JwtPayload | null> {
  const { data, error } = await supabase.auth.getClaims();

  if (error) {
    if (isAuthSessionMissingError(error)) return null;
    throw error;
  }

  return data?.claims ?? null;
}
