import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/admin-auth", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/queries/admin", () => ({
  searchAdminAttendees: vi.fn(), getAdminAttendee: vi.fn(), getAdminRaffleAttendees: vi.fn(),
}));
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { searchAdminAttendees, getAdminAttendee, getAdminRaffleAttendees } from "@/lib/supabase/queries/admin";
import { searchAttendeesAction, getAttendeeDetailAction, getRaffleSnapshotAction } from "@/app/(admin)/admin/actions";

afterEach(() => vi.resetAllMocks());

describe("legacy client-read server actions", () => {
  it.each([
    ["search", () => searchAttendeesAction("test")],
    ["detail", () => getAttendeeDetailAction("00000000-0000-4000-8000-000000000001")],
    ["raffle", () => getRaffleSnapshotAction()],
  ])("reauthorizes %s before opening a database client", async (_name, action) => {
    vi.mocked(requireAdmin).mockRejectedValue(new Error("redirect:/events"));
    await expect((action as () => Promise<unknown>)()).rejects.toThrow("redirect:/events");
    expect(createClient).not.toHaveBeenCalled();
    expect(searchAdminAttendees).not.toHaveBeenCalled();
    expect(getAdminAttendee).not.toHaveBeenCalled();
    expect(getAdminRaffleAttendees).not.toHaveBeenCalled();
  });

  it("preserves authorized legacy search pagination", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
    vi.mocked(searchAdminAttendees).mockResolvedValue([]);
    await expect(searchAttendeesAction("  sample  ", 50)).resolves.toEqual([]);
    expect(searchAdminAttendees).toHaveBeenCalledWith(undefined, "sample", 50, 50);
  });

  it("rejects invalid offsets before a query", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
    await expect(searchAttendeesAction("sample", -1)).rejects.toThrow("Invalid pagination offset");
    expect(searchAdminAttendees).not.toHaveBeenCalled();
  });

  it("rejects invalid attendee identifiers before a query", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
    await expect(getAttendeeDetailAction("invalid")).rejects.toThrow("Invalid attendee");
    expect(getAdminAttendee).not.toHaveBeenCalled();
  });
});
