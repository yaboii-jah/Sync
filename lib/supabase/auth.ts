import {
  isAuthApiError,
  isAuthSessionMissingError,
  type JwtPayload,
  type SupabaseClient,
} from "@supabase/supabase-js";
import type { Database } from "./database.types";

type ServerSupabaseClient = SupabaseClient<Database>;

const TERMINAL_SESSION_ERROR_CODES = new Set([
  "session_expired",
  "refresh_token_not_found",
  "refresh_token_already_used",
]);

/** A dead refresh token is an unauthenticated state, not an app failure. */
export function isTerminalAuthError(error: unknown): boolean {
  return (
    isAuthSessionMissingError(error) ||
    (isAuthApiError(error) &&
      typeof error.code === "string" &&
      TERMINAL_SESSION_ERROR_CODES.has(error.code))
  );
}

/** Use the same verified claim state for every server-side auth decision. */
export async function getAuthenticatedClaims(
  supabase: ServerSupabaseClient,
): Promise<JwtPayload | null> {
  const { data, error } = await supabase.auth.getClaims();

  if (error) {
    if (isTerminalAuthError(error)) return null;
    throw error;
  }

  return data?.claims ?? null;
}
