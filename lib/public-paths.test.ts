import { describe, expect, it } from "vitest";
import { isPublicPath } from "./public-paths";

describe("isPublicPath", () => {
  it.each([
    "/",
    "/login",
    "/c/invitation-token",
    "/opengraph-image",
    "/twitter-image",
  ])(
    "keeps %s public regardless of the feature flag",
    (pathname) => {
      expect(isPublicPath(pathname, false)).toBe(true);
    },
  );

  it("exposes exactly the public event page when multi-tenant routing is enabled", () => {
    expect(isPublicPath("/invite", true)).toBe(true);
    expect(isPublicPath("/e/community-day", true)).toBe(true);
    expect(isPublicPath("/e/community-day/", true)).toBe(true);
    expect(isPublicPath("/e", true)).toBe(false);
    expect(isPublicPath("/e/community-day/home", true)).toBe(false);
    expect(isPublicPath("/e/community-day/alerts", true)).toBe(false);
  });

  it("keeps the event route private while the feature flag is disabled", () => {
    expect(isPublicPath("/invite", false)).toBe(false);
    expect(isPublicPath("/e/community-day", false)).toBe(false);
  });
});
