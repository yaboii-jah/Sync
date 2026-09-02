import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isVerifiedGoogleUser } from "@/lib/supabase/auth-user";

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

  if (!isVerifiedGoogleUser(user)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/?error=provider", origin));
  }

  /*
   * Straight to the app unless the proxy captured an internal destination
   * first. Re-validate it after the round trip through the OAuth provider.
   */
  const next = searchParams.get("next");
  const destination =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/home";

  return NextResponse.redirect(new URL(destination, origin));
}
