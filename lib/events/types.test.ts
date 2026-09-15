import { describe, expect, it } from "vitest";

import { deriveEventPermissions, EVENT_THEME_PRESETS, STORED_EVENT_THEME_PRESETS } from "./types";

describe("deriveEventPermissions", () => {
  it("keeps legacy event branding readable without offering it for creation", () => {
    expect(STORED_EVENT_THEME_PRESETS).toContain("legacy_aws");
    expect(EVENT_THEME_PRESETS).not.toContain("legacy_aws");
  });
  it("grants full draft setup permissions only to the active owner", () => {
    expect(deriveEventPermissions("owner", "active", "draft", false)).toEqual({
      canViewAttendeeExperience: true,
      canManageContent: true,
      canManageAttendees: true,
      canManageAdmins: true,
      canTransferOwnership: true,
      canPublish: true,
      canArchive: true,
      canDeleteDraft: true,
    });
  });

  it("lets an active admin operate content without owner-only powers", () => {
    expect(
      deriveEventPermissions("admin", "active", "published", false),
    ).toEqual({
      canViewAttendeeExperience: true,
      canManageContent: true,
      canManageAttendees: true,
      canManageAdmins: false,
      canTransferOwnership: false,
      canPublish: false,
      canArchive: false,
      canDeleteDraft: false,
    });
  });

  it("makes archived membership read-only", () => {
    expect(
      deriveEventPermissions("owner", "active", "archived", false),
    ).toEqual({
      canViewAttendeeExperience: true,
      canManageContent: false,
      canManageAttendees: false,
      canManageAdmins: false,
      canTransferOwnership: false,
      canPublish: false,
      canArchive: false,
      canDeleteDraft: false,
    });
  });

  it.each(["left", "removed", "blocked"] as const)(
    "denies an inactive %s membership",
    (status) => {
      expect(
        deriveEventPermissions("attendee", status, "published", false),
      ).toEqual({
        canViewAttendeeExperience: false,
        canManageContent: false,
        canManageAttendees: false,
        canManageAdmins: false,
        canTransferOwnership: false,
        canPublish: false,
        canArchive: false,
        canDeleteDraft: false,
      });
    },
  );

  it("fails closed for suspended events", () => {
    expect(
      deriveEventPermissions("owner", "active", "published", true),
    ).toEqual({
      canViewAttendeeExperience: false,
      canManageContent: false,
      canManageAttendees: false,
      canManageAdmins: false,
      canTransferOwnership: false,
      canPublish: false,
      canArchive: false,
      canDeleteDraft: false,
    });
  });
});
