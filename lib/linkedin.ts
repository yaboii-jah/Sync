const LINKEDIN_URL_PATTERN =
  /^https?:\/\/(www\.|m\.)?linkedin\.com\/in\/[a-z0-9\-_%]+(?:\/[^\s?#]*)*(?:\?[^\s#]*)?(?:#\S*)?\/?$/i;

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

/**
 * Where an attendee's QR code should send whoever scans it.
 *
 * The stored profile URL when we have one — that is the exact destination and
 * always preferred. When we do not, a LinkedIn people search for the attendee's
 * name, which we always have because it comes from the LinkedIn sign-in itself.
 *
 * This exists because LinkedIn never gives us the profile URL. Its OIDC
 * response carries only sub, name, given_name, family_name, picture, locale and
 * email, and the `sub` is pairwise — minted per application, so it is neither a
 * profile slug nor correlatable with LinkedIn at all. The URL can therefore only
 * come from the attendee typing it, and requiring that before the QR would
 * render was the single biggest piece of friction in the app.
 *
 * A name search is a weaker destination than a profile link, and deliberately
 * so: the alternative was no QR at all until someone typed a URL on a phone.
 * Whoever scans has just met this person and is looking at their face, so
 * picking them out of a result list is trivial. The name is quoted to ask
 * LinkedIn for an exact-phrase match rather than a loose one.
 *
 * The search URL bounces through LinkedIn's login when the scanner has no
 * session, preserving the destination in `session_redirect` — which is the
 * normal case handled well, since anyone scanning a LinkedIn QR at a networking
 * event is already signed in on that phone.
 */
export function linkedInScanTarget(
  linkedinUrl: string | null,
  name: string,
): string {
  if (linkedinUrl) return linkedinUrl;

  const keywords = encodeURIComponent(`"${name.trim()}"`);

  return `https://www.linkedin.com/search/results/people/?keywords=${keywords}`;
}

/**
 * Pulls a LinkedIn profile URL out of arbitrary shared text.
 *
 * The Web Share Target hands over whatever the sharing app decided to send, and
 * LinkedIn's share sheet wraps the URL in a sentence rather than sending it
 * bare. Chrome also documents that on Android the `url` field is frequently
 * empty and the link arrives inside `text`, or occasionally `title` — a handler
 * reading only `url` works on a few devices and looks broken on most, so all
 * three are scanned.
 *
 * Returns the canonical form via the shared normalizer, or null when the text
 * holds no profile link. Anything shared that is not a LinkedIn profile — a
 * post, a company page, a job listing — simply misses and is ignored.
 */
export function extractLinkedInProfileUrl(
  ...candidates: (string | null | undefined)[]
): string | null {
  const pattern =
    /https?:\/\/(?:[a-z0-9-]+\.)?linkedin\.com\/in\/[a-z0-9\-_%]+/i;

  for (const candidate of candidates) {
    if (!candidate) continue;

    const match = candidate.match(pattern);

    if (match) {
      const normalized = normalizeLinkedInProfileUrl(match[0]);
      if (normalized) return normalized;
    }
  }

  return null;
}
