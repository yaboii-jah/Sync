import { afterEach, describe, expect, it, vi } from "vitest";
import { createInvitationToken, eventInvitationUrl, invitationTokenHash, isTeamReason, teamInputError } from "./team";

describe("event team helpers", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("creates hash-only tokens and fragment invitation URLs", () => {
    const token = createInvitationToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(invitationTokenHash(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(invitationTokenHash("bad")).toBeNull();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://sync.example.test/anything");
    expect(eventInvitationUrl(token)).toBe(`https://sync.example.test/invite#${token}`);
  });

  it("validates team inputs", () => {
    expect(teamInputError(" admin@example.com ")).toBeNull();
    expect(teamInputError("not-an-email")).toContain("valid");
    expect(isTeamReason("Too short")).toBe(true);
    expect(isTeamReason("short")).toBe(false);
  });
});
