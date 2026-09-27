import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => { throw new Error("not-found"); }),
  redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }),
}));
vi.mock("@/lib/feature-flags", () => ({ isMultiTenantPlatformEnabled: vi.fn(() => true) }));
vi.mock("@/lib/supabase/profile", () => ({ requireCompleteProfile: vi.fn(async () => ({ user: { id: "user-a" } })) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));
vi.mock("@/lib/supabase/queries/events", () => ({ getEventAccessBySlug: vi.fn() }));

import EventPhotoBoothPage from "@/app/e/[slug]/photo-booth/page";
import { isMultiTenantPlatformEnabled } from "@/lib/feature-flags";
import { getEventAccessBySlug } from "@/lib/supabase/queries/events";

const page = (slug = "design-week") => EventPhotoBoothPage({ params: Promise.resolve({ slug }) });
const access = { event: { name: "Design Week", membershipStatus: "active", lifecycle: "published", isSuspended: false } };

afterEach(() => vi.clearAllMocks());

describe("scoped Photo Booth route", () => {
  it("is unavailable while the multi-tenant flag is off", async () => {
    vi.mocked(isMultiTenantPlatformEnabled).mockReturnValueOnce(false);
    await expect(page()).rejects.toThrow("not-found");
    expect(getEventAccessBySlug).not.toHaveBeenCalled();
  });

  it("rejects invalid slugs and sends nonmembers to the event page", async () => {
    await expect(page("invalid slug")).rejects.toThrow("not-found");
    vi.mocked(getEventAccessBySlug).mockResolvedValueOnce(null);
    await expect(page()).rejects.toThrow("redirect:/e/design-week");
  });

  it.each([
    [{ ...access.event, membershipStatus: "blocked" }, "blocked member"],
    [{ ...access.event, lifecycle: "draft" }, "draft"],
    [{ ...access.event, isSuspended: true }, "suspended event"],
  ])("rejects %s", async (event) => {
    vi.mocked(getEventAccessBySlug).mockResolvedValueOnce({ event } as never);
    await expect(page()).rejects.toThrow("not-found");
  });

  it.each(["published", "archived"])("allows active members of %s events", async (lifecycle) => {
    vi.mocked(getEventAccessBySlug).mockResolvedValueOnce({ event: { ...access.event, lifecycle } } as never);
    await expect(page()).resolves.toMatchObject({ type: expect.any(Function) });
  });
});
