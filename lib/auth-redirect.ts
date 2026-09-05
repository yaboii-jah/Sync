const INTERNAL_URL_BASE = "https://sync.invalid";

export function getSafeInternalPath(
  value: string | string[] | null | undefined,
): string {
  const requested = Array.isArray(value) ? value[0] : value;

  if (
    !requested ||
    !requested.startsWith("/") ||
    requested.startsWith("//") ||
    requested.includes("\\")
  ) {
    return "/home";
  }

  try {
    const url = new URL(requested, INTERNAL_URL_BASE);
    if (url.origin !== INTERNAL_URL_BASE) return "/home";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/home";
  }
}

export function serializeForInlineScript(value: string): string {
  const escapedCharacters: Record<string, string> = {
    "<": "\\u003c",
    ">": "\\u003e",
    "&": "\\u0026",
    "\u2028": "\\u2028",
    "\u2029": "\\u2029",
  };

  return JSON.stringify(value).replace(
    /[<>&\u2028\u2029]/g,
    (character) => escapedCharacters[character],
  );
}
