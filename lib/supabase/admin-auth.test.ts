import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }) }));
vi.mock("./request-auth", () => ({ getRequestAuth: vi.fn() }));
vi.mock("./queries/admin", () => ({ isAdmin: vi.fn() }));
import { currentUserIsAdmin, requireAdmin } from "./admin-auth";
import { getRequestAuth } from "./request-auth";
import { isAdmin } from "./queries/admin";

const original = process.env.MULTI_TENANT_PLATFORM_ENABLED;
afterEach(() => {
  if (original === undefined) delete process.env.MULTI_TENANT_PLATFORM_ENABLED;
  else process.env.MULTI_TENANT_PLATFORM_ENABLED = original;
  vi.clearAllMocks();
});

describe("legacy admin boundary", () => {
  it("blocks stale global admin action references after cutover", async () => {
    process.env.MULTI_TENANT_PLATFORM_ENABLED = "true";
    await expect(requireAdmin()).rejects.toThrow("redirect:/events");
    expect(getRequestAuth).not.toHaveBeenCalled();
    expect(isAdmin).not.toHaveBeenCalled();
  });
  it("does not treat global admin assignments as event roles", async () => {
    process.env.MULTI_TENANT_PLATFORM_ENABLED = "true";
    expect(await currentUserIsAdmin()).toBe(false);
    expect(isAdmin).not.toHaveBeenCalled();
  });
});
