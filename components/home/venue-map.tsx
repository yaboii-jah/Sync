import { ExternalLink, MapPin } from "lucide-react";
import { Typography } from "@/components/ui";

const CAMPUS_ADDRESS =
  "Asia Pacific College, 3 Humabon Place, Magallanes, Makati City 1232, Philippines";
const CAMPUS_MAP_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CAMPUS_ADDRESS)}`;
const CAMPUS_MAP_EMBED_URL = `https://maps.google.com/maps?q=${encodeURIComponent(CAMPUS_ADDRESS)}&z=16&output=embed`;

/**
 * Desktop-only companion to the venue link in the event card. The embed is
 * intentionally live so attendees can pan, zoom, and inspect the area before
 * travelling to the venue.
 */
export function VenueMap() {
  return (
    <section
      aria-labelledby="venue-map-heading"
      className="mt-6 hidden overflow-hidden rounded-2xl border border-border bg-surface shadow-sm lg:block"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <Typography type="body-sm" weight="semibold" id="venue-map-heading">
            Venue map
          </Typography>
          <Typography type="body-xs" color="muted" className="mt-0.5 truncate">
            Asia Pacific College
          </Typography>
        </div>
        <a
          href={CAMPUS_MAP_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open Asia Pacific College in Google Maps"
          className="text-accent shrink-0 rounded-md p-2 transition hover:bg-default focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
        >
          <ExternalLink className="size-4" aria-hidden />
        </a>
      </div>
      <div className="relative aspect-[4/3] border-t border-border bg-surface-secondary">
        <iframe
          title="Interactive map of Asia Pacific College"
          src={CAMPUS_MAP_EMBED_URL}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0 size-full border-0"
        />
        <span className="sr-only">
          Use the map controls to pan and zoom around Asia Pacific College.
        </span>
      </div>
      <div className="flex items-center gap-2 px-4 py-3 text-muted">
        <MapPin className="size-4 shrink-0" aria-hidden />
        <Typography type="body-xs" className="truncate">
          3 Humabon Place, Magallanes, Makati
        </Typography>
      </div>
    </section>
  );
}
