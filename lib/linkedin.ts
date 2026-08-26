const LINKEDIN_URL_PATTERN =
  /^https?:\/\/([a-z0-9\-]+\.)?linkedin\.com\/in\/[a-z0-9\-_%]+(?:\/[^\s?#]*)*(?:\?[^\s#]*)?(?:#\S*)?\/?$/i;

export function isValidLinkedInProfileUrl(value: string): boolean {
  return LINKEDIN_URL_PATTERN.test(value.trim());
}

export function normalizeLinkedInProfileUrl(value: string): string | null {
  const trimmed = value.trim().replace(/[.,;)]+$/, "");

  if (!isValidLinkedInProfileUrl(trimmed)) return null;

  const match = trimmed.match(/linkedin\.com\/in\/([a-z0-9\-_%]+)/i);

  if (!match) return null;

  return `https://www.linkedin.com/in/${match[1].toLowerCase()}`;
}
