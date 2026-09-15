export const EVENT_LIFECYCLES = ["draft", "published", "archived"] as const;
export type EventLifecycle = (typeof EVENT_LIFECYCLES)[number];

export const EVENT_ROLES = ["owner", "admin", "attendee"] as const;
export type EventRole = (typeof EVENT_ROLES)[number];

export const MEMBERSHIP_STATUSES = [
  "active",
  "left",
  "removed",
  "blocked",
] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const EVENT_THEME_PRESETS = [
  "daylight",
  "midnight",
  "festival",
] as const;
export type EventThemePreset = (typeof EVENT_THEME_PRESETS)[number];
// The private legacy preset is readable, never offered to new organizers.
export const STORED_EVENT_THEME_PRESETS = [...EVENT_THEME_PRESETS, "legacy_aws"] as const;
export type StoredEventThemePreset = (typeof STORED_EVENT_THEME_PRESETS)[number];

export interface EventContext {
  id: string;
  slug: string;
  name: string;
  lifecycle: EventLifecycle;
  isSuspended: boolean;
  timezone: string;
  themePreset: StoredEventThemePreset;
  accentColor: string;
}
export interface EventPermissions {
  canViewAttendeeExperience: boolean;
  canManageContent: boolean;
  canManageAttendees: boolean;
  canManageAdmins: boolean;
  canTransferOwnership: boolean;
  canPublish: boolean;
  canArchive: boolean;
  canDeleteDraft: boolean;
}

const NO_EVENT_PERMISSIONS: EventPermissions = {
  canViewAttendeeExperience: false,
  canManageContent: false,
  canManageAttendees: false,
  canManageAdmins: false,
  canTransferOwnership: false,
  canPublish: false,
  canArchive: false,
  canDeleteDraft: false,
};

export function deriveEventPermissions(
  role: EventRole | null,
  membershipStatus: MembershipStatus | null,
  lifecycle: EventLifecycle,
  isSuspended: boolean,
): EventPermissions {
  if (!role || membershipStatus !== "active" || isSuspended) {
    return { ...NO_EVENT_PERMISSIONS };
  }

  const isOwner = role === "owner";
  const isStaff = isOwner || role === "admin";
  const isWritable = lifecycle !== "archived";

  return {
    canViewAttendeeExperience: lifecycle !== "draft" || isStaff,
    canManageContent: isStaff && isWritable,
    canManageAttendees: isStaff && isWritable,
    canManageAdmins: isOwner && isWritable,
    canTransferOwnership: isOwner && isWritable,
    canPublish: isOwner && lifecycle === "draft",
    canArchive: isOwner && lifecycle !== "archived",
    canDeleteDraft: isOwner && lifecycle === "draft",
  };
}
