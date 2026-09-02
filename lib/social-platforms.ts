export interface SocialPlatform {
  id: string;
  name: string;
  openButton: string;
  placeholder: string;
  /** Loose pattern to sanity-check the URL before generating a QR. */
  urlPattern: RegExp;
}

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  {
    id: "linkedin",
    name: "LinkedIn",
    openButton: "Open my LinkedIn",
    placeholder: "https://www.linkedin.com/in/username",
    urlPattern:
      /^https?:\/\/(www\.|m\.)?linkedin\.com\/in\/[a-z0-9\-_%]+/i,
  },
  {
    id: "instagram",
    name: "Instagram",
    openButton: "Open my Instagram",
    placeholder: "https://www.instagram.com/username",
    urlPattern:
      /^https?:\/\/(www\.)?instagram\.com\/[a-z0-9\-_.]+/i,
  },
  {
    id: "facebook",
    name: "Facebook",
    openButton: "Open my Facebook",
    placeholder: "https://www.facebook.com/username",
    urlPattern:
      /^https?:\/\/(www\.|m\.|web\.)?facebook\.com\/[a-z0-9\-_.]+/i,
  },
];

export function isValidSocialUrl(
  platform: SocialPlatform,
  url: string,
): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  return platform.urlPattern.test(trimmed);
}
