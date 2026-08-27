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

  // Straight to the app. There is no longer a LinkedIn-URL step to detour
  // through — see the note in `requireCompleteProfile`.
  return NextResponse.redirect(new URL("/home", origin));
}
