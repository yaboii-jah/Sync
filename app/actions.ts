"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signInWithLinkedIn(): Promise<void> {
  const headerList = await headers();
  const origin =
    headerList.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";

  if (!origin) redirect("/?error=configuration");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "linkedin_oidc",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error || !data.url) redirect("/?error=oauth");

  redirect(data.url);
}
