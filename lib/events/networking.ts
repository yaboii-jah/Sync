import { eventCardPath } from "./routing";

const LEGACY_CARD_PATH = /^\/c\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i;
const EVENT_CARD_PATH = /^\/e\/([a-z0-9]+(?:-[a-z0-9]+)*)\/c\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i;

export function networkingCardPathFromQr(value: string, origin: string, eventSlug?: string): string | null {
  try {
    const url = new URL(value.trim(), origin);
    if (eventSlug) {
      if (url.origin !== origin) return null;
      const match = url.pathname.match(EVENT_CARD_PATH);
      return match?.[1] === eventSlug ? eventCardPath(eventSlug, match[2]) : null;
    }
    const match = url.pathname.match(LEGACY_CARD_PATH);
    return match ? `/c/${match[1]}` : null;
  } catch {
    return null;
  }
}
