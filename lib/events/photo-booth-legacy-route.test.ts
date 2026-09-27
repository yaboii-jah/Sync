import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }) }));
vi.mock("@/lib/feature-flags", () => ({ isMultiTenantPlatformEnabled: vi.fn(() => true) }));
vi.mock("@/lib/supabase/profile", () => ({ requireCompleteProfile: vi.fn(async () => ({ user: { id: "user-a" } })) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));
vi.mock("@/lib/supabase/queries/events", () => ({ getUserEvents: vi.fn() }));

import LegacyPhotoBoothPage from "@/app/(app)/more/photo-booth/page";
import { isMultiTenantPlatformEnabled } from "@/lib/feature-flags";
import { getUserEvents } from "@/lib/supabase/queries/events";

afterEach(() => vi.clearAllMocks());

describe("legacy Photo Booth entry", () => {
  it("retains its own page and frame set while the flag is off", async () => {
    vi.mocked(isMultiTenantPlatformEnabled).mockReturnValueOnce(false);
    await expect(LegacyPhotoBoothPage()).resolves.toMatchObject({ type: "main" });
    expect(getUserEvents).not.toHaveBeenCalled();
  });

  it("redirects to an eligible event when the flag is on", async () => {
    vi.mocked(getUserEvents).mockResolvedValueOnce([{ id: "one", slug: "design-week", role: "attendee",
      membershipStatus: "active", lifecycle: "published", isSuspended: false,
      startsAt: "2026-10-10T00:00:00Z", endsAt: "2026-10-11T00:00:00Z" }] as never);
    await expect(LegacyPhotoBoothPage()).rejects.toThrow("redirect:/e/design-week/photo-booth");
  });

  it("sends members without eligible events to the event hub", async () => {
    vi.mocked(getUserEvents).mockResolvedValueOnce([]);
    await expect(LegacyPhotoBoothPage()).rejects.toThrow("redirect:/events");
  });
});
