import {
  AuthApiError,
  AuthSessionMissingError,
} from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { isTerminalAuthError } from "./auth";

describe("isTerminalAuthError", () => {
  it("recognizes a missing session", () => {
    expect(isTerminalAuthError(new AuthSessionMissingError())).toBe(true);
  });

  it.each([
    "session_expired",
    "refresh_token_not_found",
    "refresh_token_already_used",
  ])("recognizes %s as an unauthenticated state", (code: string) => {
    expect(
      isTerminalAuthError(new AuthApiError("session ended", 401, code)),
    ).toBe(true);
  });

  it("does not hide unrelated auth failures", () => {
    expect(
      isTerminalAuthError(
        new AuthApiError("rate limited", 429, "over_request_rate_limit"),
      ),
    ).toBe(false);
    expect(isTerminalAuthError(new Error("network failed"))).toBe(false);
  });
});
