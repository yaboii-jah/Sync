import { createSyncSocialImage, SOCIAL_IMAGE_SIZE } from "@/lib/social-image";

export const alt = "Sync, a focused event companion for schedules, live updates, and attendee connection.";
export const size = SOCIAL_IMAGE_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return createSyncSocialImage();
}
