import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => { throw new Error("not-found"); }),
  redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }),
}));
vi.mock("./request-auth", () => ({ getRequestAuth: vi.fn() }));
import { requirePlatformSuperAdmin } from "./platform-admin-auth";
import { getRequestAuth } from "./request-auth";

const original = process.env.MULTI_TENANT_PLATFORM_ENABLED;
afterEach(() => {
  if (original === undefined) delete process.env.MULTI_TENANT_PLATFORM_ENABLED;
  else process.env.MULTI_TENANT_PLATFORM_ENABLED = original;
  vi.clearAllMocks();
});

describe("platform super-admin boundary", () => {
  it("does not expose the route while multi-tenant mode is disabled", async () => {
    delete process.env.MULTI_TENANT_PLATFORM_ENABLED;
    await expect(requirePlatformSuperAdmin()).rejects.toThrow("not-found");
    expect(getRequestAuth).not.toHaveBeenCalled();
  });
  it("redirects signed-out visitors to authentication", async () => {
    process.env.MULTI_TENANT_PLATFORM_ENABLED = "true";
    vi.mocked(getRequestAuth).mockResolvedValue({ supabase: {} as never, claims: null });
    await expect(requirePlatformSuperAdmin()).rejects.toThrow("redirect:/?next=/super-admin");
  });
  it("requires an active assignment", async () => {
    process.env.MULTI_TENANT_PLATFORM_ENABLED = "true";
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle }) });
    const supabase = { from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq }) }) };
    vi.mocked(getRequestAuth).mockResolvedValue({ supabase: supabase as never, claims: { sub: "user-1" } as never });
    await expect(requirePlatformSuperAdmin()).rejects.toThrow("not-found");
  });
});
