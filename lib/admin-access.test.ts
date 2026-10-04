import { describe, expect, it } from "vitest";
import { isAdminAccessRequest, parseAdminUserAccess } from "./admin-access";

const id = "11000000-0000-4000-8000-00000000000a";
const request = { userId: id, grantAdmin: true, requestId: "22000000-0000-4000-8000-000000000001" };
const attendee = { user_id: id, is_admin: false, is_protected: false, is_self: false, can_grant: true, can_revoke: false };

describe("admin access boundaries", () => {
  it("accepts grants and revocations with valid request UUIDs", () => {
    expect(isAdminAccessRequest(request)).toBe(true);
    expect(isAdminAccessRequest({ ...request, grantAdmin: false })).toBe(true);
  });
  it.each([null, {}, { ...request, grantAdmin: "false" }, { ...request, userId: "Catherine" }, { ...request, requestId: null }])(
    "rejects malformed or coerced mutation input %j", (input) => {
      expect(isAdminAccessRequest(input)).toBe(false);
    },
  );
  it("accepts a correctly scoped access snapshot", () => {
    expect(parseAdminUserAccess(attendee, id)).toEqual(attendee);
  });
  it("matches UUIDs case-insensitively", () => {
    expect(parseAdminUserAccess(attendee, id.toUpperCase())).toEqual(attendee);
  });
  it.each([
    null,
    { ...attendee, user_id: request.requestId },
    { ...attendee, can_grant: "true" },
    { ...attendee, can_revoke: true },
    { ...attendee, is_protected: true },
    { ...attendee, is_admin: true },
    { ...attendee, is_admin: true, can_grant: false, can_revoke: true, is_self: true },
    { ...attendee, is_admin: true, can_grant: false, can_revoke: true, is_protected: true },
  ])("rejects malformed, misdirected, or inconsistent RPC data %j", (input) => {
    expect(() => parseAdminUserAccess(input, id)).toThrow("Could not verify admin access.");
  });
});
