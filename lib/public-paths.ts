const ALWAYS_PUBLIC_PATHS = [
  "/",
  "/login",
  "/c",
  "/opengraph-image",
  "/twitter-image",
];

/**
 * Public event access stops at `/e/[slug]`. Descendant routes are attendee
 * surfaces and must pass through the authentication bounce with their full
 * pathname preserved.
 */
export function isPublicPath(
  pathname: string,
  multiTenantEnabled: boolean,
): boolean {
  if (
    ALWAYS_PUBLIC_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    )
  ) {
    return true;
  }

  if (!multiTenantEnabled) return false;
  return pathname === "/invite" || /^\/e\/[^/]+\/?$/.test(pathname);
}
