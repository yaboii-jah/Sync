export type AppearanceMode = "light" | "dark";
export type AppearancePreference = AppearanceMode | "system";

export const APPEARANCE_STORAGE_KEY = "sync-app-appearance";

export function parseAppearancePreference(value: unknown): AppearancePreference {
  return value === "light" || value === "dark" ? value : "system";
}

export function resolveAppearance(
  preference: AppearancePreference,
  deviceIsDark: boolean,
): AppearanceMode {
  return preference === "system" ? (deviceIsDark ? "dark" : "light") : preference;
}

// Synchronous head script: CSS can paint the saved palette before hydration.
// Only these presentation attributes change; the server's public tokens stay light.
export const APPEARANCE_INITIALIZER = `(function(){var p="system";try{var s=localStorage.getItem("${APPEARANCE_STORAGE_KEY}");if(s==="light"||s==="dark")p=s;}catch(e){}var d=window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.dataset.appPreference=p;document.documentElement.dataset.appAppearance=p==="system"?(d?"dark":"light"):p;})();`;
