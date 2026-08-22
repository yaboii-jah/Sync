const LINKEDIN_URL_PATTERN =
  /^https:\/\/(www\.)?linkedin\.com\/in\/[a-z0-9\-_%]+\/?$/i;

export function isValidLinkedInProfileUrl(value: string): boolean {
  return LINKEDIN_URL_PATTERN.test(value.trim());
}
