/**
 * Canonical forms for the networking destinations an attendee may publish.
 *
 * The database holds the real rule: `social_profiles.social_profiles_canonical_url_check`
 * accepts only one exact URL shape per network. These patterns mirror that
 * check so a mistyped link is rejected in the form rather than as a constraint
 * violation, and so pasted links — mobile hosts, tracking query strings,
 * trailing punctuation — are reduced to the one shape the column accepts. The
 * database stays the authority: anything that slips past here still fails there.
 */
export const SOCIAL_NETWORKS = [
  "linkedin",
  "instagram",
  "facebook",
  "github",
] as const;

export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];

/** Links keyed by network, as both the card reader and the editor use them. */
export type SocialLinks = Partial<Record<SocialNetwork, string>>;

interface NetworkSpec {
  label: string;
  placeholder: string;
  /** A full profile URL for this network, capturing the identifying part. */
  url: RegExp;
  /** The same identifying part typed on its own, without a URL around it. */
  handle: RegExp;
  /** Builds the single URL shape the column's check constraint accepts. */
  canonical: (handle: string) => string;
  /** Root paths belonging to the platform rather than to a profile. */
  reserved?: ReadonlySet<string>;
}

export const SOCIAL_SPECS: Record<SocialNetwork, NetworkSpec> = {
  linkedin: {
    label: "LinkedIn",
    placeholder: "https://linkedin.com/in/your-name",
    url: /^(?:https?:\/\/)?(?:[a-z0-9-]+\.)?linkedin\.com\/in\/([a-z0-9\-_%]{1,100})\/?$/i,
    handle: /^([a-z0-9\-_%]{1,100})$/i,
    canonical: (handle) => `https://www.linkedin.com/in/${handle}`,
  },
  instagram: {
    label: "Instagram",
    placeholder: "https://instagram.com/yourhandle",
    url: /^(?:https?:\/\/)?(?:[a-z0-9-]+\.)?instagram\.com\/([a-z0-9._]{1,30})\/?$/i,
    handle: /^@?([a-z0-9._]{1,30})$/i,
    canonical: (handle) => `https://www.instagram.com/${handle}/`,
    reserved: new Set([
      "about",
      "accounts",
      "direct",
      "explore",
      "p",
      "reel",
      "reels",
      "stories",
    ]),
  },
  facebook: {
    label: "Facebook",
    placeholder: "https://facebook.com/yourhandle",
    url: /^(?:https?:\/\/)?(?:[a-z0-9-]+\.)?facebook\.com\/(profile\.php\?id=[0-9]{1,200}|[a-z0-9.]{1,50})\/?$/i,
    handle: /^@?([a-z0-9.]{1,50})$/i,
    canonical: (handle) => `https://www.facebook.com/${handle}`,
    reserved: new Set([
      "about",
      "events",
      "groups",
      "help",
      "marketplace",
      "pages",
      "photo",
      "reel",
      "share",
      "stories",
      "watch",
    ]),
  },
  github: {
    label: "GitHub",
    placeholder: "https://github.com/your-name",
    url: /^(?:https?:\/\/)?(?:www\.)?github\.com\/([a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?)\/?$/i,
    handle: /^@?([a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?)$/i,
    canonical: (handle) => `https://github.com/${handle}`,
    reserved: new Set([
      "about",
      "apps",
      "collections",
      "contact",
      "enterprise",
      "events",
      "explore",
      "features",
      "login",
      "marketplace",
      "new",
      "notifications",
      "organizations",
      "orgs",
      "pricing",
      "search",
      "settings",
      "signup",
      "sponsors",
      "topics",
      "trending",
      "users",
    ]),
  },
};

/**
 * Reduces one pasted value to the canonical URL, or null when it is not a
 * profile link for that network. An empty value returns null, which the callers
 * read as "no link for this network" rather than as an error.
 *
 * Anything shaped like a URL must match that network's profile URL exactly, so
 * a post, a company page or a group — `linkedin.com/company/aws`,
 * `instagram.com/p/abc` — is rejected rather than mistaken for the handle in
 * its last path segment. A value with no host is treated as a typed handle.
 */
export function normalizeSocialUrl(
  network: SocialNetwork,
  value: string,
): string | null {
  const spec = SOCIAL_SPECS[network];
  const withoutFragment = value.trim().replace(/#.*$/, "").replace(/[.,;)]+$/, "");
  /*
   * A query string is tracking noise everywhere except one place: Facebook's
   * numeric profile form carries its identity in `?id=`, and the column's check
   * constraint accepts that exact shape.
   */
  const trimmed = /[?&]id=[0-9]/.test(withoutFragment)
    ? withoutFragment
    : withoutFragment.replace(/\?.*$/, "");

  if (!trimmed) return null;

  const looksLikeUrl = /^[a-z]+:\/\//i.test(trimmed) || trimmed.includes("/");
  const match = trimmed.match(looksLikeUrl ? spec.url : spec.handle);

  if (!match) return null;

  const handle = match[1].toLowerCase();
  if (spec.reserved?.has(handle)) return null;

  return spec.canonical(handle);
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
      const normalized = normalizeSocialUrl("linkedin", match[0]);
      if (normalized) return normalized;
    }
  }

  return null;
}
