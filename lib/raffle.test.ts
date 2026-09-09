import { describe, expect, it } from "vitest";
import { formatRaffleEntries, raffleText } from "./raffle";

describe("formatRaffleEntries", () => {
  it("sorts alphabetically and numbers names matching after case and whitespace normalization", () => {
    expect(
      formatRaffleEntries([
        { id: "f", name: "Zed" },
        { id: "d", name: " Ana " },
        { id: "b", name: " Juan\tCruz " },
        { id: "a", name: "juan  cruz" },
      ]),
    ).toEqual([
      { id: "d", label: "Ana", isDuplicate: false },
      { id: "a", label: "juan cruz #1", isDuplicate: true },
      { id: "b", label: "Juan Cruz #2", isDuplicate: true },
      { id: "f", label: "Zed", isDuplicate: false },
    ]);
  });

  it("drops unusable names defensively", () => {
    expect(
      formatRaffleEntries([
        { id: "a", name: " \n\t " },
        { id: "b", name: "Maria" },
      ]),
    ).toEqual([{ id: "b", label: "Maria", isDuplicate: false }]);
  });

  it("builds the exact one-name-per-line clipboard and download text", () => {
    expect(
      raffleText([
        { id: "a", label: "Ana", isDuplicate: false },
        { id: "b", label: "Juan Cruz #1", isDuplicate: true },
      ]),
    ).toBe("Ana\nJuan Cruz #1");
  });
});
