import { NextResponse, type NextRequest } from "next/server";
import { getSafeInternalPath } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const destination = getSafeInternalPath(next);

  if (!code) {
    return redirectTo(request, "/");
  }

  const supabase = await createClient();
  const flowId = searchParams.get("sb_flow_id");
  const { error } = await supabase.auth.exchangeCodeForSession(
    code,
    flowId ? { flowId } : undefined,
  );

  if (error) {
    // A duplicated callback can arrive after the first request has already
    // exchanged the one-time code. Keep the established session instead of
    // sending the user back to sign-in with a misleading PKCE error.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) return redirectToComplete(request, destination);

    console.error("[auth/callback] exchange failed:", error.message);
    return redirectTo(request, "/?error=oauth");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectTo(request, "/?error=oauth");
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
  return redirectToComplete(request, destination);
}

function redirectToComplete(
  request: NextRequest,
  destination: string,
): NextResponse {
  const completeUrl = new URL("/auth/complete", request.url);
  completeUrl.searchParams.set("next", destination);
  return redirectTo(request, completeUrl.pathname + completeUrl.search);
}

function redirectTo(request: NextRequest, path: string): NextResponse {
  const response = NextResponse.redirect(new URL(path, request.url));
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, max-age=0, must-revalidate",
  );
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
  return response;
}
