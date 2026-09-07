import { NextResponse, type NextRequest } from "next/server";

import { getAuthenticatedClaims } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { extractLinkedInProfileUrl } from "@/lib/social";
import { getOwnNetworkingCard } from "@/lib/supabase/queries/networking";

function isTrustedShareRequest(request: NextRequest, origin: string): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return false;
  }

  const requestOrigin = request.headers.get("origin");
  if (requestOrigin && requestOrigin !== origin) return false;

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      if (new URL(referer).origin !== origin) return false;
    } catch {
      return false;
    }
  }

  return true;
}

function redirectTo(origin: string, path: string) {
  return NextResponse.redirect(new URL(path, origin), 303);
}

/**
 * Web Share Target endpoint — how an attendee sets their exact profile link
 * without typing anything.
 *
 * The manifest uses POST because this endpoint changes the attendee's saved
 * links. Origin and Fetch Metadata checks reject cross-site form submissions;
 * the no-header case remains valid for installed-browser share requests.
 *
 * Sync is an installable PWA, so registering a `share_target` in the manifest
 * puts it in the Android share sheet. Inside the LinkedIn app the attendee taps
 * *Share profile -> Sync*, and the URL arrives here directly. Two taps, no
 * keyboard, once ever; from then on their QR card offers a direct profile link
 * instead of a name search.
 *
 * Chrome documents that Android frequently leaves `url` empty and puts the link
 * in `text`, so all three params are scanned. A share that carries no profile
 * URL — a post, a company page, a stray screenshot — redirects to Connect
 * unchanged rather than erroring.
 */
export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url);

  if (!isTrustedShareRequest(request, origin)) {
    return redirectTo(origin, "/connect?shared=error");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return redirectTo(origin, "/connect?shared=error");
  }

  const supabase = await createClient();
  const claims = await getAuthenticatedClaims(supabase);

  if (!claims) return redirectTo(origin, "/");

  const getText = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : null;
  };
  const linkedinUrl = extractLinkedInProfileUrl(
    getText("url"),
    getText("text"),
    getText("title"),
  );

  if (!linkedinUrl) {
    return redirectTo(origin, "/connect?shared=miss");
  }

  /*
   * `save_social_profiles` replaces the whole set, so the other links have to
   * be read back and re-sent. Posting only LinkedIn would silently drop an
   * attendee's Instagram, Facebook, or GitHub links.
   */
  const card = await getOwnNetworkingCard();

  const { error } = await supabase.rpc("save_social_profiles", {
    linkedin_url: linkedinUrl,
    instagram_url: card?.links.instagram ?? "",
    facebook_url: card?.links.facebook ?? "",
    github_url: card?.links.github ?? "",
  });

  if (error) {
    console.error("[share] failed to save shared profile URL:", error.message);
    return redirectTo(origin, "/connect?shared=error");
  }

  return redirectTo(origin, "/connect?shared=ok");
}
