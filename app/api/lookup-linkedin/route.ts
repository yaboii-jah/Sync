import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isValidLinkedInProfileUrl,
  normalizeLinkedInProfileUrl,
} from "@/lib/linkedin";

const LINKFINDER_ENDPOINT = "https://api.linkfinderai.com";
const POLL_MAX_ATTEMPTS = 4;
const POLL_DELAY_MS = 8000;

interface LinkFinderResponse {
  result?: string | null;
  status?: string;
  message?: string;
  job_id?: string;
  poll_url?: string;
}

async function callLinkFinder(email: string): Promise<string | null> {
  const apiKey = process.env.LINK_FINDER_API_KEY;
  if (!apiKey) {
    console.error("[lookup] LINK_FINDER_API_KEY is not set");
    return null;
  }

  let response = await fetch(LINKFINDER_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "email_to_linkedin_url",
      input_data: email,
    }),
  });

  let data: LinkFinderResponse = await response.json().catch(() => ({}));

  // Async fallback: any request may return 202 + job_id when slow.
  if (data.job_id && data.poll_url) {
    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, POLL_DELAY_MS));
      response = await fetch(data.poll_url!, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      data = await response.json().catch(() => ({}));
      if (data.job_id === undefined) break; // final result arrived
    }
    if (data.job_id) return null; // still processing — give up quietly
  }

  if (data.status !== "success" || !data.result) {
    console.error("[lookup] miss or error:", data.message ?? "no result");
    return null;
  }

  return normalizeLinkedInProfileUrl(data.result);
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ url: null }, { status: 401 });
  }

  // Read current profile state.
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "linkedin_url, linkedin_url_suggestion, linkedin_url_lookup_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ url: null });
  }

  // Already has a URL — nothing to look up.
  if (profile.linkedin_url) {
    return NextResponse.json({ url: null });
  }

  // Suggestion cached from an earlier attempt — serve it without re-billing.
  if (profile.linkedin_url_suggestion) {
    return NextResponse.json({ url: profile.linkedin_url_suggestion });
  }

  // Lookup already attempted once and missed — don't burn more credits.
  if (profile.linkedin_url_lookup_at) {
    return NextResponse.json({ url: null });
  }

  const suggestion = await callLinkFinder(user.email);

  await supabase
    .from("profiles")
    .update({
      linkedin_url_lookup_at: new Date().toISOString(),
      ...(suggestion ? { linkedin_url_suggestion: suggestion } : {}),
    })
    .eq("id", user.id);

  if (!suggestion || !isValidLinkedInProfileUrl(suggestion)) {
    return NextResponse.json({ url: null });
  }

  return NextResponse.json({ url: suggestion });
}
