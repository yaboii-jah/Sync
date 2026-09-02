import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { extractLinkedInProfileUrl } from "@/lib/social";
import { getOwnNetworkingCard } from "@/lib/supabase/queries/networking";

/**
 * Web Share Target endpoint — how an attendee sets their exact profile link
 * without typing anything.
 *
 * Sync is an installable PWA, so registering a `share_target` in the manifest
 * puts it in the Android share sheet. Inside the LinkedIn app the attendee taps
 * *Share profile → Sync*, and the URL arrives here directly. Two taps, no
 * keyboard, once ever; from then on their QR card offers a direct profile link
 * instead of a name search.
 *
 * This is an upgrade path, never a requirement. A card can equally be filled in
 * by hand in Settings — see `/c/[token]` for what a scanner then sees.
 *
 * Chrome documents that Android frequently leaves `url` empty and puts the link
 * in `text`, so all three params are scanned. A share that carries no profile
 * URL — a post, a company page, a stray screenshot — redirects to Connect
 * unchanged rather than erroring, because a share sheet is easy to mis-tap and
 * losing the user into an error page for it would be worse than doing nothing.
 *
 * Availability, stated rather than assumed: Web Share Target is Chrome on
 * Android and requires the PWA to be installed. iOS Safari does not implement
 * it, which is exactly why nothing depends on this route.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.redirect(new URL("/", origin));

  const linkedinUrl = extractLinkedInProfileUrl(
    searchParams.get("url"),
    searchParams.get("text"),
    searchParams.get("title"),
  );

  if (!linkedinUrl) {
    return NextResponse.redirect(new URL("/connect?shared=miss", origin));
  }

  /*
   * `save_social_profiles` replaces the whole set, so the other two links have
   * to be read back and re-sent. Posting only LinkedIn here would silently drop
   * an attendee's Instagram and Facebook links.
   */
  const card = await getOwnNetworkingCard();

  const { error } = await supabase.rpc("save_social_profiles", {
    linkedin_url: linkedinUrl,
    instagram_url: card?.links.instagram ?? "",
    facebook_url: card?.links.facebook ?? "",
  });

  if (error) {
    console.error("[share] failed to save shared profile URL:", error.message);
    return NextResponse.redirect(new URL("/connect?shared=error", origin));
  }

  return NextResponse.redirect(new URL("/connect?shared=ok", origin));
}
