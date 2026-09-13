import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedClaims } from "./lib/supabase/auth";
import { getSupabaseEnv } from "./lib/supabase/env";
import { isMultiTenantPlatformEnabled } from "./lib/feature-flags";
import { isPublicPath } from "./lib/public-paths";

export async function proxy(request: NextRequest) {
  const { url, publishableKey } = getSupabaseEnv();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });

  const claims = await getAuthenticatedClaims(supabase);
  setPrivateNoStore(response);

  const { pathname } = request.nextUrl;
  const multiTenantEnabled = isMultiTenantPlatformEnabled();

  if (!claims && !isPublicPath(pathname, multiTenantEnabled)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    /*
     * Carry the destination through the login bounce.
     *
     * Private deep links survive authentication. Only the path is kept, never
     * the original query, so an OAuth code can never leak onto a public page.
     */
    redirectUrl.search = `?next=${encodeURIComponent(pathname)}`;
    return setPrivateNoStore(redirectWithCookies(redirectUrl, response));
  }

  if (claims && (pathname === "/" || pathname === "/login")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = multiTenantEnabled ? "/events" : "/home";
    redirectUrl.search = "";
    return setPrivateNoStore(redirectWithCookies(redirectUrl, response));
  }

  return response;
}

function redirectWithCookies(
  redirectUrl: URL,
  response: NextResponse,
): NextResponse {
  const redirectResponse = NextResponse.redirect(redirectUrl);

  response.cookies
    .getAll()
    .forEach((cookie) => redirectResponse.cookies.set(cookie));

  return redirectResponse;
}

function setPrivateNoStore(response: NextResponse): NextResponse {
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, max-age=0, must-revalidate",
  );
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export const config = {
  matcher: [
    "/((?!api|auth|_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
