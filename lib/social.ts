/**
 * Canonical forms for the networking destinations an attendee may publish.
 *
 * Direct profile links are reduced to one stable URL per network. Facebook's
 * mobile share sheet can instead produce an opaque `/share/<token>/` link, so
 * that approved platform route is preserved rather than guessed or followed.
 * The database constraint mirrors these forms as a final backstop.
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
  /** Builds the single URL shape the column's check constraint accepts. */
  canonical: (handle: string) => string;
  /** Root paths belonging to the platform rather than to a profile. */
  reserved?: ReadonlySet<string>;
}

export const SOCIAL_SPECS: Record<SocialNetwork, NetworkSpec> = {
  linkedin: {
    label: "LinkedIn",
    placeholder: "https://linkedin.com/in/your-name",
    canonical: (handle) => `https://www.linkedin.com/in/${handle}`,
  },
  instagram: {
    label: "Instagram",
    placeholder: "https://instagram.com/yourhandle",
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

const SOCIAL_ROOTS: Record<SocialNetwork, string> = {
  linkedin: "linkedin.com",
  instagram: "instagram.com",
  facebook: "facebook.com",
  github: "github.com",
};
const MAX_SOCIAL_URL_LENGTH = 256;

const DIRECT_PROFILE_PATTERNS: Record<SocialNetwork, RegExp> = {
  linkedin: /^\/in\/([a-z0-9_%\-]{1,100})(?:\/[a-z0-9._~%\-]+)*\/?$/i,
  instagram: /^\/?@?([a-z0-9._]{1,30})\/?$/i,
  facebook: /^\/([a-z0-9.]{1,50})\/?$/i,
  github: /^\/([a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?)\/?$/i,
};

function isTrustedHostname(network: SocialNetwork, hostname: string): boolean {
  const root = SOCIAL_ROOTS[network];
  return hostname === root || hostname.endsWith(`.${root}`);
}

function isPlatformAddress(value: string, network: SocialNetwork): boolean {
  const root = SOCIAL_ROOTS[network];
  return new RegExp(`^(?:[a-z0-9-]+\\.)?${root.replace(".", "\\.")}(?:/|$)`, "i").test(
    value,
  );
}

function parseUrl(value: string, network: SocialNetwork): URL | null {
  const looksLikeUrl =
    /^[a-z][a-z\d+.-]*:\/\//i.test(value) ||
    value.includes("/") ||
    isPlatformAddress(value, network);
  if (!looksLikeUrl) return null;

  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(value)
    ? value
    : `https://${value}`;

  try {
    const url = new URL(candidate);
    if (!/^https?:$/.test(url.protocol)) return null;
    if (
      url.username ||
      url.password ||
      url.port ||
      !isTrustedHostname(network, url.hostname.toLowerCase())
    ) {
      return null;
    }

    url.protocol = "https:";
    url.hostname = `www.${SOCIAL_ROOTS[network]}`;
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function normalizeFacebookShareUrl(url: URL): string | null {
  if (!/^\/share\/[A-Za-z0-9_-]{1,200}\/?$/.test(url.pathname)) {
    return null;
  }

  return url.toString();
}

function normalizeDirectProfileUrl(
  network: SocialNetwork,
  url: URL,
): string | null {
  if (network === "facebook" && url.pathname === "/profile.php") {
    if (!/^\?id=[0-9]{1,200}$/.test(url.search)) return null;
    return `https://www.facebook.com/profile.php${url.search}`;
  }

  const match = url.pathname.match(DIRECT_PROFILE_PATTERNS[network]);
  if (!match) return null;

  const handle = match[1].toLowerCase();
  if (SOCIAL_SPECS[network].reserved?.has(handle)) return null;

  return SOCIAL_SPECS[network].canonical(handle);
}

/**
 * Reduces one pasted value to a canonical URL, or null when it is not an
 * approved destination for that network. An empty value returns null, which the
 * callers read as "no link for this network" rather than as an error.
 *
 * Direct URLs remain profile-shaped, so a post, company page, group, repository
 * or other platform page is rejected rather than mistaken for a handle. The
 * one deliberate opaque-link exception is Facebook's native share route.
 * A value with no host is treated as a typed handle.
 */
export function normalizeSocialUrl(
  network: SocialNetwork,
  value: string,
): string | null {
  const spec = SOCIAL_SPECS[network];
  const trimmed = value.trim().replace(/[.,;)]+$/, "");

  if (!trimmed) return null;

  const url = parseUrl(trimmed, network);
  if (url) {
    if (network === "facebook" && url.pathname.startsWith("/share/")) {
      const normalized = normalizeFacebookShareUrl(url);
      return normalized && normalized.length <= MAX_SOCIAL_URL_LENGTH
        ? normalized
        : null;
    }

    const normalized = normalizeDirectProfileUrl(network, url);
    return normalized && normalized.length <= MAX_SOCIAL_URL_LENGTH
      ? normalized
      : null;
  }

  const handlePattern =
    network === "linkedin"
      ? /^([a-z0-9\-_%]{1,100})$/i
      : network === "instagram"
        ? /^@?([a-z0-9._]{1,30})$/i
        : network === "facebook"
          ? /^@?([a-z0-9.]{1,50})$/i
          : /^@?([a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?)$/i;
  const match = trimmed.match(handlePattern);

  if (!match) return null;

  const handle = match[1].toLowerCase();
  if (spec.reserved?.has(handle)) return null;

  const normalized = spec.canonical(handle);
  return normalized.length <= MAX_SOCIAL_URL_LENGTH ? normalized : null;
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
    /https?:\/\/(?:[a-z0-9-]+\.)?linkedin\.com\/in\/[^\s<>"']+/gi;

  for (const candidate of candidates) {
    if (!candidate) continue;

    for (const match of candidate.matchAll(pattern)) {
      const normalized = normalizeSocialUrl("linkedin", match[0]);
      if (normalized) return normalized;
    }
  }

  return null;
}
