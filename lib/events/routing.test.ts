import { describe, expect, it } from "vitest";
import { eventFeedbackPath, eventHomePath, eventPhotoBoothPath, legacyPhotoBoothDestination, normalizeEventSlug, selectPreferredEvent } from "./routing";
import type { RoutableEvent } from "./routing";

const base: RoutableEvent = {
  id: "10000000-0000-4000-8000-000000000001",
  slug: "design-week",
  lifecycle: "published",
  role: "attendee",
  membershipStatus: "active",
  startsAt: "2026-10-10T00:00:00Z",
  endsAt: "2026-10-11T00:00:00Z",
};

describe("event routing", () => {
  it("normalizes valid slugs and rejects values outside the database contract", () => {
    expect(normalizeEventSlug("  Design-Week ")).toBe("design-week");
    expect(normalizeEventSlug("no spaces")).toBeNull();
    expect(normalizeEventSlug("ab")).toBeNull();
    expect(normalizeEventSlug("design_week")).toBeNull();
  });

  it("builds an attendee route from the selected event instead of a global default", () => {
    const selected = selectPreferredEvent(
      [base, { ...base, slug: "live-now", startsAt: "2026-09-14T00:00:00Z", endsAt: "2026-09-15T00:00:00Z" }],
      "attendee",
      Date.parse("2026-09-14T08:00:00Z"),
    );
    expect(selected && eventHomePath(selected.slug)).toBe("/e/live-now/home");
    expect(eventFeedbackPath("live-now")).toBe("/e/live-now/feedback");
    expect(eventPhotoBoothPath("live-now")).toBe("/e/live-now/photo-booth");
  });

  it("excludes attendees from management selection", () => {
    expect(selectPreferredEvent([base], "manage")).toBeNull();
    expect(selectPreferredEvent([{ ...base, role: "admin" }], "manage")).not.toBeNull();
  });

  it("prefers a future published event over an archived event", () => {
    const selected = selectPreferredEvent([
      { ...base, slug: "old-event", lifecycle: "archived", startsAt: "2026-01-01T00:00:00Z", endsAt: "2026-01-02T00:00:00Z" },
      base,
    ], "attendee", Date.parse("2026-09-14T00:00:00Z"));
    expect(selected?.slug).toBe("design-week");
  });

  it("routes the legacy booth only to a suitable accessible event", () => {
    const current = { ...base, isSuspended: false };
    expect(legacyPhotoBoothDestination([
      { ...current, slug: "draft-one", lifecycle: "draft" },
      { ...current, slug: "blocked-one", membershipStatus: "blocked" },
      { ...current, slug: "suspended-one", isSuspended: true },
      { ...current, slug: "memories", lifecycle: "archived" },
    ])).toBe("/e/memories/photo-booth");
    expect(legacyPhotoBoothDestination([{ ...current, isSuspended: true }])).toBe("/events");
    expect(legacyPhotoBoothDestination([])).toBe("/events");
  });
});
