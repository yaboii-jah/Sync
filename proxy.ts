import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedClaims } from "./lib/supabase/auth";
import { getSupabaseEnv } from "./lib/supabase/env";
import { isMaintenanceModeEnabled, maintenanceResponse } from "./lib/maintenance";

const PUBLIC_PATHS = ["/", "/login", "/c"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/maintenance") return NextResponse.next();
  if (isMaintenanceModeEnabled()) return maintenanceResponse(request);
  if (isApiOrAuthPath(pathname)) return NextResponse.next();

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

  if (!claims && !isPublicPath(pathname)) {
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
    redirectUrl.pathname = "/home";
    redirectUrl.search = "";
    return setPrivateNoStore(redirectWithCookies(redirectUrl, response));
  }

  return response;
}

function isApiOrAuthPath(pathname: string): boolean {
  return ["/api", "/auth"].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
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
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|maintenance-assets/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
