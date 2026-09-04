import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/", origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchange failed:", error.message);
    return NextResponse.redirect(
      new URL(`/?error=oauth&detail=${encodeURIComponent(error.message)}`, origin),
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/?error=oauth", origin));
  }

  const picture = user.user_metadata?.picture;
  const avatar = user.user_metadata?.avatar_url;
  const photoUrl =
    typeof picture === "string" && picture.trim()
      ? picture.trim()
      : typeof avatar === "string" && avatar.trim()
        ? avatar.trim()
        : null;

  if (photoUrl) {
    const { error: photoError } = await supabase
      .from("profiles")
      .update({ photo_url: photoUrl })
      .eq("id", user.id);

    if (photoError) {
      console.error("[auth/callback] profile photo refresh failed:", photoError.message);
    }
  }

  /*
   * Straight to the app — there is no longer a LinkedIn-URL step to detour
   * through (see the note in `requireCompleteProfile`) — unless the proxy
   * captured a destination first, which is how a scanned QR survives a
   * sign-in. Re-validated here rather than trusted: this value has been out to
   * the identity provider and back, so it is treated as untrusted input on
   * return.
   */
  const next = searchParams.get("next");
  const destination =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/home";

  return NextResponse.redirect(new URL(destination, origin));
}
