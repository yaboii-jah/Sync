import type { User } from "@supabase/supabase-js";

export function isVerifiedGoogleUser(user: User): boolean {
  const providers = Array.isArray(user.app_metadata.providers)
    ? user.app_metadata.providers
    : [];

  return (
    (user.app_metadata.provider === "google" || providers.includes("google")) &&
    Boolean(user.email) &&
    Boolean(user.email_confirmed_at)
  );
}
