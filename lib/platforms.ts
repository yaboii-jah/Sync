export type SocialPlatform = "linkedin" | "instagram" | "facebook";

export interface PlatformConfig {
  id: SocialPlatform;
  name: string;
  openButtonLabel: string;
  urlPattern: RegExp;
  urlPlaceholder: string;
  urlExample: string;
}

export const PLATFORMS: Record<SocialPlatform, PlatformConfig> = {
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    openButtonLabel: "Open my LinkedIn",
    urlPattern: /^https?:\/\/(www\.|m\.)?linkedin\.com\/in\/[a-z0-9\-_%]+(?:\/[^\s?#]*)*(?:\?[^\s#]*)?(?:#\S*)?\/?$/i,
    urlPlaceholder: "https://www.linkedin.com/in/username",
    urlExample: "https://www.linkedin.com/in/username",
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    openButtonLabel: "Open my Instagram",
    urlPattern: /^https?:\/\/(www\.)?instagram\.com\/[a-z0-9\._]+\/?$/i,
    urlPlaceholder: "https://www.instagram.com/username",
    urlExample: "https://www.instagram.com/username",
  },
  facebook: {
    id: "facebook",
    name: "Facebook",
    openButtonLabel: "Open my Facebook",
    urlPattern: /^https?:\/\/(www\.|m\.)?facebook\.com\/[a-z0-9\._]+\/?$/i,
    urlPlaceholder: "https://www.facebook.com/username",
    urlExample: "https://www.facebook.com/username",
  },
};

export const PLATFORM_LIST = Object.values(PLATFORMS);

export function isValidPlatformUrl(platform: SocialPlatform, url: string): boolean {
  return PLATFORMS[platform].urlPattern.test(url.trim());
}

export function getPlatformConfig(platform: SocialPlatform): PlatformConfig {
  return PLATFORMS[platform];
}