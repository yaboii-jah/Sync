import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { smoke } from "../scripts/release-testing-smoke.mjs";

function transport(fault?: string) {
  return async (url: URL, options: RequestInit) => {
    const path = decodeURIComponent(url.pathname);
    const headers = { "cache-control": fault === "cached" ? "public, max-age=60" : "private, no-store" };
    if (path === "/") return new Response(options.method === "HEAD" ? null : "Sync South Summity 2026", { headers });
    if (path === "/maintenance") return new Response("We’ll be back soon.");
    if (path.startsWith("/icons/") || path.startsWith("/new-assets/") || path.startsWith("/assets/") || path.startsWith("/maintenance-assets/") || ["/sw.js", "/manifest.webmanifest"].includes(path)) {
      return new Response(fault === "asset" ? new Uint8Array([1]) : new Uint8Array(await readFile(resolve("public", path.slice(1)))));
    }
    const isBounce = ["/login", "/auth/callback"].includes(path);
    const destination = fault === "redirect" ? "https://unexpected.example/" : isBounce ? "/" : `/?next=${encodeURIComponent(path)}`;
    return new Response(null, { status: fault === "exposed" && path === "/admin" ? 200 : 307, headers: { ...headers, location: destination } });
  };
}

describe("production testing acceptance", () => {
  it("accepts signed-out navigation and byte-identical release assets", async () => {
    const result = await smoke("https://example.com", transport());
    expect(result.maintenance).toBe(false);
    expect(result.checks.some((check) => check.path === "/more/photo-booth" && check.status === 307)).toBe(true);
  });
  it.each(["cached", "redirect", "exposed", "asset"])("refuses a release with %s behavior", async (fault) => {
    await expect(smoke("https://example.com", transport(fault))).rejects.toThrow();
  });
});
