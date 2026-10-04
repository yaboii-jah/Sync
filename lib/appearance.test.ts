import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import {
  APPEARANCE_INITIALIZER,
  APPEARANCE_STORAGE_KEY,
  parseAppearancePreference,
  resolveAppearance,
} from "./appearance";

describe("browser-local appearance", () => {
  it("accepts only explicit light/dark choices and otherwise follows the device", () => {
    expect(parseAppearancePreference("light")).toBe("light");
    expect(parseAppearancePreference("dark")).toBe("dark");
    for (const value of [null, undefined, "system", "DARK", "", {}, "invalid"]) {
      expect(parseAppearancePreference(value)).toBe("system");
    }
  });

  it("manual choices override either device preference", () => {
    for (const device of [false, true]) {
      expect(resolveAppearance("light", device)).toBe("light");
      expect(resolveAppearance("dark", device)).toBe("dark");
    }
    expect(resolveAppearance("system", false)).toBe("light");
    expect(resolveAppearance("system", true)).toBe("dark");
  });

  it.each([
    { stored: "dark", device: false, preference: "dark", mode: "dark" },
    { stored: "light", device: true, preference: "light", mode: "light" },
    { stored: null, device: true, preference: "system", mode: "dark" },
    { stored: "invalid", device: false, preference: "system", mode: "light" },
  ])("initializes before hydration: $stored / device dark $device", ({ stored, device, preference, mode }) => {
    const dataset: Record<string, string> = {};
    runInNewContext(APPEARANCE_INITIALIZER, {
      localStorage: { getItem: (key: string) => { expect(key).toBe(APPEARANCE_STORAGE_KEY); return stored; } },
      window: { matchMedia: () => ({ matches: device }) },
      document: { documentElement: { dataset } },
    });
    expect(dataset).toEqual({ appPreference: preference, appAppearance: mode });
  });

  it("still initializes the device palette when storage access is denied", () => {
    const dataset: Record<string, string> = {};
    runInNewContext(APPEARANCE_INITIALIZER, {
      localStorage: { getItem: () => { throw new Error("Storage denied"); } },
      window: { matchMedia: () => ({ matches: true }) },
      document: { documentElement: { dataset } },
    });
    expect(dataset).toEqual({ appPreference: "system", appAppearance: "dark" });
  });
});
