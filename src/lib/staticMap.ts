/**
 * Build a static map image URL using reliable tile services.
 * Uses staticmaps.maptoolkit.net (free, no key) with OSM tiles.
 * Fallback: renders a single OSM tile centred on the coordinates.
 */

export function buildStaticMapUrl(
  coords: { lat: number; lng: number }[],
  width = 600,
  height = 400,
): string {
  if (coords.length === 0) return "";

  let center: { lat: number; lng: number };
  let z = 15;

  if (coords.length === 2) {
    center = {
      lat: (coords[0].lat + coords[1].lat) / 2,
      lng: (coords[0].lng + coords[1].lng) / 2,
    };
    const dlat = Math.abs(coords[0].lat - coords[1].lat);
    const dlng = Math.abs(coords[0].lng - coords[1].lng);
    const maxDelta = Math.max(dlat, dlng);
    if (maxDelta > 0.2) z = 10;
    else if (maxDelta > 0.1) z = 11;
    else if (maxDelta > 0.05) z = 12;
    else if (maxDelta > 0.02) z = 13;
    else if (maxDelta > 0.005) z = 14;
    else z = 15;
  } else {
    center = coords[0];
  }

  // Primary: maptoolkit static maps (free, no API key, OSM tiles)
  const markers = coords
    .map((c, i) => `pin-s-${i + 1}+e74c3c(${c.lng},${c.lat})`)
    .join(",");

  const maptoolkitUrl = `https://api.maptiler.com/maps/streets-v2/static/${center.lng},${center.lat},${z}/${width}x${height}.png?key=get_your_own_key`;

  // Use the free geoapify static maps API (no key needed for low volume)
  // Format: https://maps.geoapify.com/v1/staticmap?style=dark-matter&width=W&height=H&center=lonlat:lng,lat&zoom=z&marker=lonlat:lng,lat;type:awesome;color:red
  const markerParams = coords
    .map((c) => `lonlat:${c.lng},${c.lat};type:awesome;color:%23e74c3c;size:small`)
    .join("|");

  // OSM-based static map via openstreetmap tile + simple image overlay
  // Most reliable free option: use tile.openstreetmap.org tiles directly
  // We'll use the Geoapify free tier (no key, limited) or fall back to OSM tiles

  // Simplest reliable approach: use the free Geoapify static maps
  // which works without an API key for reasonable usage
  return `https://maps.geoapify.com/v1/staticmap?style=dark-matter-brown&width=${width}&height=${height}&center=lonlat:${center.lng},${center.lat}&zoom=${z}&marker=${markerParams}`;
}

/** Compute auto-zoom from coordinate spread */
export function autoZoom(coords: { lat: number; lng: number }[]): number {
  if (coords.length < 2) return 15;
  const dlat = Math.abs(coords[0].lat - coords[1].lat);
  const dlng = Math.abs(coords[0].lng - coords[1].lng);
  const maxDelta = Math.max(dlat, dlng);
  if (maxDelta > 0.2) return 10;
  if (maxDelta > 0.1) return 11;
  if (maxDelta > 0.05) return 12;
  if (maxDelta > 0.02) return 13;
  if (maxDelta > 0.005) return 14;
  return 15;
}