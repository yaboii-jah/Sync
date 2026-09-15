import { describe, expect, it } from "vitest";
import { formatEventDateTimeInput, parseEventDateTimeInput, suggestEventSlug, validateEventBasics } from "./basics";
import { eventManagePath, legacyAdminDestination } from "./routing";

describe("event basics", () => {
  it("suggests canonical event URLs", () => {
    expect(suggestEventSlug("Café / Design Week 2026!")).toBe("cafe-design-week-2026");
    expect(suggestEventSlug("a".repeat(90))).toHaveLength(80);
  });
  it("interprets Manila wall times independently of the host timezone", () => {
    expect(parseEventDateTimeInput("2026-10-10T09:30", "Asia/Manila")).toBe("2026-10-10T01:30:00.000Z");
    expect(formatEventDateTimeInput("2026-10-10T01:30:00Z", "Asia/Manila")).toBe("2026-10-10T09:30");
  });
  it("supports fractional offsets", () => {
    expect(parseEventDateTimeInput("2026-10-10T09:30", "Asia/Kathmandu")).toBe("2026-10-10T03:45:00.000Z");
  });
  it("rejects daylight-saving gaps and repeated times", () => {
    expect(parseEventDateTimeInput("2026-03-08T02:30", "America/New_York")).toBeNull();
    expect(parseEventDateTimeInput("2026-11-01T01:30", "America/New_York")).toBeNull();
    expect(parseEventDateTimeInput("2026-11-01T03:30", "America/New_York")).toBe("2026-11-01T08:30:00.000Z");
  });
  it("rejects malformed and impossible dates", () => {
    expect(parseEventDateTimeInput("2026-02-30T09:00", "UTC")).toBeNull();
    expect(parseEventDateTimeInput("2026-10-10T09:00", "Invalid/Zone")).toBeNull();
    expect(parseEventDateTimeInput("2026-10-10T25:00", "UTC")).toBeNull();
  });
  it("reports field errors at the server contract", () => {
    const result = validateEventBasics({ name: "", slug: "bad slug", description: "", venue: "", timezone: "UTC", startsAt: "2026-10-10T12:00", endsAt: "2026-10-10T11:00" }, true);
    expect(Object.keys(result.errors)).toEqual(["name", "slug", "endsAt"]);
  });
  it("builds management routes without granting attendees legacy admin access", () => {
    expect(eventManagePath("design-week")).toBe("/manage/design-week");
    expect(legacyAdminDestination([])).toBe("/events");
    expect(legacyAdminDestination([{ id: "one", slug: "design-week", role: "attendee", membershipStatus: "active", lifecycle: "published", startsAt: "2026-10-10T00:00:00Z", endsAt: "2026-10-11T00:00:00Z" }])).toBe("/events");
  });
});
