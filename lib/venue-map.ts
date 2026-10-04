/** Keep the displayed venue and both Google Maps destinations in sync. */
export function getVenueMapLinks(venue: string | null) {
  const name = venue?.trim();
  if (!name) return null;

  const query = encodeURIComponent(name);
  return {
    venue: name,
    searchUrl: `https://www.google.com/maps/search/?api=1&query=${query}`,
    embedUrl: `https://maps.google.com/maps?q=${query}&z=16&output=embed`,
  };
}
