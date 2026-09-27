import type { EventLifecycle, EventRole, MembershipStatus } from "./types";

const EVENT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface RoutableEvent {
  id: string;
  slug: string;
  lifecycle: EventLifecycle;
  role: EventRole;
  membershipStatus: MembershipStatus;
  startsAt: string;
  endsAt: string;
}

export function normalizeEventSlug(value: string): string | null {
  const slug = value.trim().toLowerCase();
  if (slug.length < 3 || slug.length > 80 || !EVENT_SLUG_PATTERN.test(slug)) {
    return null;
  }
  return slug;
}

export function eventPublicPath(slug: string): string {
  return `/e/${slug}`;
}

export function eventHomePath(slug: string): string {
  return `${eventPublicPath(slug)}/home`;
}

export function eventAlertsPath(slug: string): string {
  return `${eventPublicPath(slug)}/alerts`;
}

export function eventSettingsPath(slug: string): string {
  return `${eventPublicPath(slug)}/settings`;
}

export function eventConnectPath(slug: string): string {
  return `${eventPublicPath(slug)}/connect`;
}

export function eventFeedbackPath(slug: string): string {
  return `${eventPublicPath(slug)}/feedback`;
}

export function eventPhotoBoothPath(slug: string): string {
  return `${eventPublicPath(slug)}/photo-booth`;
}

export function eventCardPath(slug: string, token: string): string {
  return `${eventPublicPath(slug)}/c/${token}`;
}

export function eventManagePath(slug: string): string {
  return `/manage/${slug}`;
}

export function legacyAdminDestination(events: RoutableEvent[]): string {
  const event = selectPreferredEvent(events, "manage");
  return event ? eventManagePath(event.slug) : "/events";
}

/** The legacy booth link resolves only to an accessible, non-suspended event. */
export function legacyPhotoBoothDestination(events: (RoutableEvent & { isSuspended: boolean })[]): string {
  const eligible = events.filter((event) => !event.isSuspended &&
    (event.lifecycle === "published" || event.lifecycle === "archived"));
  const event = selectPreferredEvent(eligible);
  return event ? eventPhotoBoothPath(event.slug) : "/events";
}

export function selectPreferredEvent(
  events: RoutableEvent[],
  surface: "attendee" | "manage" = "attendee",
  now = Date.now(),
): RoutableEvent | null {
  const eligible = events.filter((event) => {
    if (event.membershipStatus !== "active") return false;
    return surface === "attendee" || event.role === "owner" || event.role === "admin";
  });

  return eligible.sort((left, right) => {
    const rank = (event: RoutableEvent) => {
      if (event.lifecycle === "archived") return 3;
      const startsAt = new Date(event.startsAt).getTime();
      const endsAt = new Date(event.endsAt).getTime();
      if (startsAt <= now && now < endsAt) return 0;
      if (startsAt > now) return 1;
      return 2;
    };
    const rankDifference = rank(left) - rank(right);
    if (rankDifference !== 0) return rankDifference;

    const leftTime = new Date(left.startsAt).getTime();
    const rightTime = new Date(right.startsAt).getTime();
    return rank(left) === 1 ? leftTime - rightTime : rightTime - leftTime;
  })[0] ?? null;
}
