import { afterEach, describe, expect, it } from "vitest";

import { isMultiTenantPlatformEnabled } from "./feature-flags";

const originalValue = process.env.MULTI_TENANT_PLATFORM_ENABLED;

afterEach(() => {
  if (originalValue === undefined) {
    delete process.env.MULTI_TENANT_PLATFORM_ENABLED;
  } else {
    process.env.MULTI_TENANT_PLATFORM_ENABLED = originalValue;
  }
});
describe("isMultiTenantPlatformEnabled", () => {
  it("defaults to disabled", () => {
    delete process.env.MULTI_TENANT_PLATFORM_ENABLED;
    expect(isMultiTenantPlatformEnabled()).toBe(false);
  });

  it("only enables for the exact true value", () => {
    for (const value of ["1", "TRUE", "yes", "enabled", "false", ""]) {
      process.env.MULTI_TENANT_PLATFORM_ENABLED = value;
      expect(isMultiTenantPlatformEnabled()).toBe(false);
    }

    process.env.MULTI_TENANT_PLATFORM_ENABLED = "true";
    expect(isMultiTenantPlatformEnabled()).toBe(true);
  });
});
