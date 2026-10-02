import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config, proxy } from "../proxy";
import { isMaintenanceModeEnabled } from "./maintenance";

const originalEnvironment = {
  maintenanceMode: process.env.MAINTENANCE_MODE,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
};

beforeEach(() => {
  delete process.env.MAINTENANCE_MODE;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
});

function restoreEnvironmentValue(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

afterEach(() => {
  restoreEnvironmentValue("MAINTENANCE_MODE", originalEnvironment.maintenanceMode);
  restoreEnvironmentValue("NEXT_PUBLIC_SUPABASE_URL", originalEnvironment.supabaseUrl);
  restoreEnvironmentValue(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    originalEnvironment.publishableKey,
  );
});

describe("maintenance mode", () => {
  it("only enables for the exact server value true", () => {
    expect(isMaintenanceModeEnabled("true")).toBe(true);
    expect(isMaintenanceModeEnabled("false")).toBe(false);
    expect(isMaintenanceModeEnabled("TRUE")).toBe(false);
    expect(isMaintenanceModeEnabled(undefined)).toBe(false);
  });

  it.each(["/", "/home", "/alerts", "/admin", "/auth/callback"])(
    "gates %s before requiring Supabase configuration",
    async (pathname) => {
      process.env.MAINTENANCE_MODE = "true";

      const response = await proxy(
        new NextRequest(`https://sync.example${pathname}`),
      );

      expect(response.status).toBe(503);
      expect(response.headers.get("x-middleware-rewrite")).toBeNull();
      expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
      expect(await response.text()).toContain('<h1 id="maintenance-title">');
      expect(response.headers.get("cache-control")).toContain("no-store");
      expect(response.headers.get("pragma")).toBe("no-cache");
      expect(response.headers.get("expires")).toBe("0");
    },
  );

  it("gates HEAD and cookie-bearing requests before session handling", async () => {
    process.env.MAINTENANCE_MODE = "true";

    const response = await proxy(
      new NextRequest("https://sync.example/home", {
        method: "HEAD",
        headers: { cookie: "sb-test-auth-token=opaque-session-fixture" },
      }),
    );

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.cookies.getAll()).toEqual([]);
    expect(await response.text()).toBe("");
  });

  it.each(["/api/operation", "/home", "/auth/callback"])(
    "blocks POST requests to %s before route code",
    async (pathname) => {
      process.env.MAINTENANCE_MODE = "true";

      const response = await proxy(
        new NextRequest(`https://sync.example${pathname}`, {
          method: "POST",
        }),
      );

      expect(response.status).toBe(503);
      expect(await response.text()).toContain("planned maintenance");
      expect(response.headers.get("cache-control")).toContain("no-store");
    },
  );

  it.each(["/api", "/api/operation", "/auth", "/auth/callback"])(
    "preserves the disabled maintenance bypass for %s",
    async (pathname) => {
      process.env.MAINTENANCE_MODE = "false";
      const response = await proxy(
        new NextRequest(`https://sync.example${pathname}`),
      );
      expect(response.headers.get("x-middleware-next")).toBe("1");
    },
  );

  it.each(["true", "false"])(
    "serves the maintenance route when maintenance is %s",
    async (value) => {
      process.env.MAINTENANCE_MODE = value;
      const response = await proxy(
        new NextRequest("https://sync.example/maintenance"),
      );
      expect(response.headers.get("x-middleware-next")).toBe("1");
    },
  );

  it("serves the maintenance route without requiring Supabase configuration", async () => {
    delete process.env.MAINTENANCE_MODE;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    const response = await proxy(
      new NextRequest("https://sync.example/maintenance"),
    );

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});

describe("maintenance proxy matcher", () => {
  it.each(["/", "/home", "/alerts", "/admin", "/api/operation", "/auth/callback"])(
    "includes %s",
    (url) => {
      expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(true);
    },
  );

  it.each([
    "/_next/static/chunks/app.js",
    "/_next/image?url=%2Ficons%2Ficon-192.png&w=192&q=75",
    "/favicon.ico",
    "/sw.js",
    "/manifest.webmanifest",
    "/icons/icon-192.png",
    "/assets/story-sky.webp",
    "/maintenance-assets/geist-latin.woff2",
    "/maintenance-assets/perandory.otf",
  ])("leaves %s accessible", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(false);
  });
});
