import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

vi.mock("../legacy-admin-routing", () => ({ redirectLegacyAdmin: vi.fn() }));
vi.mock("server-only", () => ({}));
import { redirectLegacyAdmin } from "../legacy-admin-routing";
import { getAdminDashboard } from "./admin";

afterEach(() => vi.resetAllMocks());

describe("legacy admin data boundary", () => {
  it("does not begin a global RPC when the cutover guard redirects", async () => {
    vi.mocked(redirectLegacyAdmin).mockRejectedValue(new Error("redirect:/events"));
    const rpc = vi.fn();
    const client = { rpc } as unknown as SupabaseClient<Database>;
    await expect(getAdminDashboard(client)).rejects.toThrow("redirect:/events");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("preserves the legacy dashboard when the cutover guard permits it", async () => {
    vi.mocked(redirectLegacyAdmin).mockResolvedValue(undefined);
    const rpc = vi.fn().mockResolvedValue({ data: { attendee_count: 2, current_sessions: [], next_sessions: [] }, error: null });
    const client = { rpc } as unknown as SupabaseClient<Database>;
    expect(await getAdminDashboard(client)).toMatchObject({ attendee_count: 2 });
    expect(rpc).toHaveBeenCalledWith("admin_get_dashboard", undefined);
  });
});
