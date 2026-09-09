import { cache } from "react";
import { getAuthenticatedClaims } from "./auth";
import { createClient } from "./server";

/**
 * Share one auth lookup within a server render without sharing a client across
 * requests. This prevents parallel layout/header checks from racing a refresh.
 */
export const getRequestAuth = cache(async () => {
  const supabase = await createClient();
  const claims = await getAuthenticatedClaims(supabase);

  return { supabase, claims };
});
