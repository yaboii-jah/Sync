import { describe, expect, it } from "vitest";
import { networkingCardPathFromQr } from "./networking";

const token = "91000000-0000-0000-0000-000000000011";
const origin = "http://localhost:3000";

describe("networking QR routing", () => {
  it("opens only same-event cards in the scoped scanner", () => {
    expect(networkingCardPathFromQr(`${origin}/e/design-week/c/${token}`, origin, "design-week"))
      .toBe(`/e/design-week/c/${token}`);
    expect(networkingCardPathFromQr(`${origin}/e/another-event/c/${token}`, origin, "design-week")).toBeNull();
    expect(networkingCardPathFromQr(`${origin}/c/${token}`, origin, "design-week")).toBeNull();
  });

  it("rejects another origin and malformed tokens for event cards", () => {
    expect(networkingCardPathFromQr(`https://example.com/e/design-week/c/${token}`, origin, "design-week")).toBeNull();
    expect(networkingCardPathFromQr(`${origin}/e/design-week/c/not-a-token`, origin, "design-week")).toBeNull();
  });

  it("preserves legacy card parsing without accepting event cards", () => {
    expect(networkingCardPathFromQr(`https://example.com/c/${token}`, origin)).toBe(`/c/${token}`);
    expect(networkingCardPathFromQr(`${origin}/e/design-week/c/${token}`, origin)).toBeNull();
  });
});
