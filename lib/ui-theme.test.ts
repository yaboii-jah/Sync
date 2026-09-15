import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("fixed original Sync theme", () => {
  it("aliases the original palette without introducing light or tenant overrides", () => {
    const tokens = read("tokens.css");
    expect(tokens).toContain("--platform-paper: var(--background)");
    expect(tokens).toContain("--platform-accent: var(--accent)");
    expect(tokens).toContain("--platform-success: var(--success)");
    expect(tokens).not.toMatch(/color-scheme:\s*light|cobalt|--background:\s*var\(--platform/);
    const globals = read("app/globals.css");
    expect(globals).toContain("--background: #052f3c");
    expect(globals).toContain("--accent: #fcdb64");
  });

  it("keeps platform identity generic and independent of event presets", () => {
    for (const path of ["components/platform/platform-shell.tsx", "components/platform/platform-landing.tsx"]) {
      const source = read(path);
      expect(source).toContain("sync-app");
      expect(source).toContain("identity-font");
      expect(source).not.toMatch(/themePreset|accentColor|AWS/);
    }
    expect(read("app/manage/[slug]/page.tsx")).not.toContain("event.themePreset");
  });

  it("uses original colors for both shared social previews", () => {
    const social = read("lib/social-image.tsx");
    for (const color of ["#052f3c", "#f2f7ed", "#fcdb64", "#b5cbc7"]) {
      expect(social).toContain(color);
      expect(read("app/globals.css")).toContain(color);
    }
  });
});
