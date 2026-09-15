import { describe, expect, it } from "vitest";
import { organizerErrorMessage } from "./organizer-actions";

describe("organizer errors", () => {
  it("maps expected database failures to actionable safe messages", () => {
    expect(organizerErrorMessage({ code: "23505", message: "internal constraint name" })).toContain("URL is already in use");
    expect(organizerErrorMessage({ message: "active owned event limit reached" })).toContain("Archive an event");
    expect(organizerErrorMessage({ message: "event window must contain every existing session" })).toContain("existing session");
    expect(organizerErrorMessage({ message: "draft has activity and must be archived" })).toContain("Archive it");
  });
  it("does not serialize raw database diagnostics or PII", () => {
    expect(organizerErrorMessage({ message: "private database details: secret@example.com" })).not.toContain("secret@example.com");
  });
});
