import { describe, expect, it } from "vitest";
import { assertMaintenance, parseArguments, parseHeaders, smoke } from "../scripts/release-maintenance-smoke.mjs";
import { parseArguments as parseVerification } from "../scripts/event-import/verify.mjs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function maintenance(status = 503, cache = "no-store, no-cache", body = "Sync maintenance. We’ll be back soon.") {
  return new Response(body, { status, headers: { "cache-control": cache, "content-type": "text/html" } });
}

describe("maintenance release acceptance", () => {
  it("accepts only explicit origins and permits local verification", () => {
    expect(parseArguments(["--url", "https://sync.aws-scd.cloud"])).toBe("https://sync.aws-scd.cloud");
    expect(parseArguments(["--url", "http://127.0.0.1:3100"])).toBe("http://127.0.0.1:3100");
    expect(parseArguments(["--url", "https://example.vercel.app", "--vercel"])).toBe("https://example.vercel.app");
    expect(() => parseArguments(["--url", "https://example.com", "--wrong"])).toThrow();
    for (const value of ["http://example.com", "https://user:password@example.com", "https://example.com/home", "https://example.com/?secret=1"]) {
      expect(() => parseArguments(["--url", value])).toThrow();
    }
  });
  it("uses the final authenticated HTTP response rather than an interim status", () => {
    const result = parseHeaders("HTTP/1.1 200 Connection established\r\n\r\nHTTP/2 503\r\nCache-Control: no-store, no-cache\r\nContent-Type: text/html\r\n\r\n");
    expect(result.status).toBe(503);
    expect(result.headers.get("cache-control")).toContain("no-store");
    expect(() => parseHeaders("not HTTP headers")).toThrow();
  });
  it.each([200, 307, 401])("rejects status %s even with maintenance-looking content", async (status) => {
    await expect(assertMaintenance(maintenance(status), "GET")).rejects.toThrow("Expected 503");
  });
  it("rejects cacheable maintenance and unexpected content", async () => {
    await expect(assertMaintenance(maintenance(503, "public, max-age=60"), "GET")).rejects.toThrow("cached");
    await expect(assertMaintenance(maintenance(503, "no-store, no-cache", "upstream failure"), "GET")).rejects.toThrow("content missing");
    await expect(assertMaintenance(new Response("Sync maintenance", { status: 503,
      headers: { "cache-control": "no-store, no-cache", "content-type": "text/plain" } }), "GET")).rejects.toThrow("text/html");
  });
  it("rejects HEAD bodies and location headers", async () => {
    await expect(assertMaintenance(maintenance(), "HEAD")).rejects.toThrow("HEAD");
    const response = maintenance();
    response.headers.set("location", "/login");
    await expect(assertMaintenance(response, "GET")).rejects.toThrow("redirects");
  });
  it("verifies the full HTTP contract and refuses a changed deployed asset", async () => {
    const methods: Array<{ method: string; path: string }> = [];
    let corrupt = false;
    const request = async (url: URL, options: RequestInit) => {
      const path = decodeURIComponent(url.pathname);
      methods.push({ method: options.method ?? "GET", path });
      if (path === "/maintenance") return new Response("We’ll be back soon.");
      if (path === "/api/release-maintenance-check") return new Response("Sync maintenance", {
        status: 503, headers: { "cache-control": "no-store, no-cache", "content-type": "text/plain" },
      });
      if (path.startsWith("/icons/") || path.startsWith("/assets/") || path.startsWith("/maintenance-assets/")
        || path.startsWith("/new-assets/") || ["/sw.js", "/manifest.webmanifest"].includes(path)) {
        const bytes = corrupt ? new Uint8Array([1]) : new Uint8Array(await readFile(resolve("public", path.slice(1))));
        return new Response(bytes);
      }
      return options.method === "HEAD" ? new Response(null, { status: 503, headers: { "cache-control": "no-store, no-cache" } }) : maintenance();
    };
    const result = await smoke("https://example.com", request);
    expect(result.maintenance).toBe(true);
    expect(result.checks).toHaveLength(32);
    expect(methods.filter((row) => row.method !== "GET" && row.method !== "HEAD"))
      .toEqual([{ method: "POST", path: "/api/release-maintenance-check" }]);
    corrupt = true;
    await expect(smoke("https://example.com", request)).rejects.toThrow("differs from release");
  });
  it("requires the exact production project and bounded evidence label", () => {
    expect(parseVerification(["--project-ref", "mygybolhwoeckrgczclm", "--label", "before-release"])).toBe("before-release");
    expect(() => parseVerification(["--project-ref", "other", "--label", "before-release"])).toThrow();
    expect(() => parseVerification(["--project-ref", "mygybolhwoeckrgczclm", "--label", "../../commit"])).toThrow();
    expect(() => parseVerification(["execute"])).toThrow();
  });
});
