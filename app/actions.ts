"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signInWithLinkedIn(formData?: FormData): Promise<void> {
  const headerList = await headers();
  const origin =
    headerList.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";

  if (!origin) redirect("/?error=configuration");

  /*
   * A relative in-app path to return to after sign-in, set by the proxy when it
   * bounces an unauthenticated visitor. Validated as starting with a single "/"
   * so it can only ever be an internal destination — "//evil.com" is a
   * protocol-relative URL and must not survive this check.
   */
  const rawNext = formData?.get("next");
  const next =
    typeof rawNext === "string" &&
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//")
      ? rawNext
      : null;

  const callback = next
    ? `${origin}/auth/callback?next=${encodeURIComponent(next)}`
    : `${origin}/auth/callback`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "linkedin_oidc",
    options: {
      redirectTo: callback,
    },
  });

  if (error || !data.url) redirect("/?error=oauth");

  redirect(data.url);
}
