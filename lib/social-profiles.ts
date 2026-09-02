export const SOCIAL_NETWORKS = ["linkedin", "instagram", "facebook"] as const;

export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];

export interface SocialProfileLink {
  network: SocialNetwork;
  url: string;
}

export const SOCIAL_NETWORK_LABELS: Record<SocialNetwork, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  facebook: "Facebook",
};

const RESERVED_INSTAGRAM_PATHS = new Set([
  "about",
  "accounts",
  "direct",
  "explore",
  "p",
  "reel",
  "reels",
  "stories",
]);

const RESERVED_FACEBOOK_PATHS = new Set([
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
]);

function hasAllowedHost(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function asUrl(value: string, domain: string): URL | null {
  const candidate = /^https?:\/\//i.test(value)
    ? value
    : hasAllowedHost(value.split("/")[0].toLowerCase(), domain)
      ? `https://${value}`
      : null;

  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.port ||
      !hasAllowedHost(url.hostname.toLowerCase(), domain)
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function normalizeLinkedIn(value: string): string | null {
  const url = asUrl(value, "linkedin.com");
  const slug = url
    ? url.pathname.split("/").filter(Boolean)[0]?.toLowerCase() === "in"
      ? url.pathname.split("/").filter(Boolean)[1]
      : null
    : value.replace(/^@/, "");

  if (!slug || !/^[a-z0-9_%\-]{1,100}$/i.test(slug)) return null;
  if (url && url.pathname.split("/").filter(Boolean).length !== 2) return null;

  return `https://www.linkedin.com/in/${slug.toLowerCase()}`;
}

function normalizeInstagram(value: string): string | null {
  const url = asUrl(value, "instagram.com");
  const path = url?.pathname.split("/").filter(Boolean) ?? [];
  const handle = url ? path[0] : value.replace(/^@/, "");
  const normalized = handle?.toLowerCase();

  if (
    !normalized ||
    (url && path.length !== 1) ||
    RESERVED_INSTAGRAM_PATHS.has(normalized) ||
    !/^[a-z0-9._]{1,30}$/.test(normalized)
  ) {
    return null;
  }

  return `https://www.instagram.com/${normalized}/`;
}

function normalizeFacebook(value: string): string | null {
  const url = asUrl(value, "facebook.com");

  if (url?.pathname.toLowerCase() === "/profile.php") {
    const id = url.searchParams.get("id");
    return id && /^\d{1,200}$/.test(id)
      ? `https://www.facebook.com/profile.php?id=${id}`
      : null;
  }

  const path = url?.pathname.split("/").filter(Boolean) ?? [];
  const handle = url ? path[0] : value.replace(/^@/, "");
  const normalized = handle?.toLowerCase();

  if (
    !normalized ||
    (url && path.length !== 1) ||
    RESERVED_FACEBOOK_PATHS.has(normalized) ||
    !/^[a-z0-9.]{1,50}$/.test(normalized)
  ) {
    return null;
  }

  return `https://www.facebook.com/${normalized}`;
}

export function normalizeSocialProfileUrl(
  network: SocialNetwork,
  input: string,
): string | null {
  const value = input.trim();
  if (!value) return null;

  switch (network) {
    case "linkedin":
      return normalizeLinkedIn(value);
    case "instagram":
      return normalizeInstagram(value);
    case "facebook":
      return normalizeFacebook(value);
  }
}
