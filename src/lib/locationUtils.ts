/** Lightweight location utilities — distance, motion, timestamps */

/** Haversine distance in miles between two lat/lng pairs */
export function distanceMiles(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Format distance for display */
export function formatDistance(miles: number): string {
  if (miles < 0.05) return "Right here";
  if (miles < 0.2) return `${Math.round(miles * 5280)} ft away`;
  if (miles < 10) return `${miles.toFixed(1)} mi away`;
  return `${Math.round(miles)} mi away`;
}

/** Detect motion from two coordinates + timestamps */
export type MotionState = "moving" | "stopped" | "unknown";

export function detectMotion(
  prev: { lat: number; lng: number; time: number } | null,
  curr: { lat: number; lng: number; time: number },
): MotionState {
  if (!prev) return "unknown";
  const dt = (curr.time - prev.time) / 1000; // seconds
  if (dt < 3) return "unknown"; // too close together
  const dist = distanceMiles(prev.lat, prev.lng, curr.lat, curr.lng);
  const speedMph = (dist / dt) * 3600;
  if (speedMph > 2) return "moving"; // >2mph = on the move
  return "stopped";
}

/** Improved human-readable timestamp */
export function humanTimestamp(updatedAt: string): string {
  const age = Date.now() - new Date(updatedAt).getTime();
  if (age < 10_000) return "Just now";
  if (age < 30_000) return "A moment ago";
  if (age < 60_000) return `${Math.floor(age / 1000)}s ago`;
  if (age < 3_600_000) return `${Math.floor(age / 60_000)} min ago`;
  if (age < 86_400_000) return `${Math.floor(age / 3_600_000)}h ago`;
  return "Recently";
}
