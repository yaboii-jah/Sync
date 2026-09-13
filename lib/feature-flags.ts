/**
 * This module is server-only by convention: never import it from a Client
 * Component. The non-public environment name keeps the value out of browser
 * bundles and the exact comparison makes every missing/unknown value fail shut.
 */
export function isMultiTenantPlatformEnabled(): boolean {
  return process.env.MULTI_TENANT_PLATFORM_ENABLED === "true";
}
