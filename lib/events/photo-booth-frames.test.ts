import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("scoped Photo Booth frames", () => {
  it.each([1, 2])("provides a Sync-only 9:16 local frame %i", (number) => {
    const svg = readFileSync(join(process.cwd(), "public", "assets", `sync-photo-booth-frame-${number}.svg`), "utf8");
    expect(svg).toContain('width="1080" height="1920"');
    expect(svg).toContain("SYNC");
    expect(svg).toContain("PHOTO BOOTH");
    expect(svg).not.toMatch(/AWS|MEGA MANILA|STUDENT COMMUNITY DAY|<image|<script|href=/i);
  });
});
