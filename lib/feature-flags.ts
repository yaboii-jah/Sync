/** Photo Booth stays unavailable until the deployment explicitly enables it. */
export function isPhotoBoothEnabled(): boolean {
  return process.env.PHOTO_BOOTH_ENABLED === "true";
}
