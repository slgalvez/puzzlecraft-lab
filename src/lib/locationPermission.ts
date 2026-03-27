/**
 * Location permission detection + platform-specific guidance.
 * Shared utility for location features and PWA mode detection.
 */

// ── PWA / Standalone detection (single source of truth) ──

export function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  const mediaMatch = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return Boolean(mediaMatch) || iosStandalone;
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

// ── Permission states ──

export type LocationPermissionState =
  | "granted"
  | "prompt"
  | "denied"
  | "unsupported"
  | "unknown";

/**
 * Query the current geolocation permission state without triggering a prompt.
 * Falls back to "unknown" on platforms where Permissions API isn't supported (iOS).
 */
export async function queryLocationPermission(): Promise<LocationPermissionState> {
  if (!("geolocation" in navigator)) return "unsupported";

  // iPhone/iPad Safari and Home Screen apps are unreliable here.
  // Let getCurrentPosition determine the real state instead of caching a stale denial.
  if (isIOS()) return "unknown";

  // Permissions API — supported on Chrome, Firefox, Edge; NOT on Safari/iOS
  if ("permissions" in navigator) {
    try {
      const result = await navigator.permissions.query({ name: "geolocation" as PermissionName });
      if (result.state === "granted") return "granted";
      if (result.state === "denied") return "denied";
      return "prompt";
    } catch {
      // permissions.query may throw on some browsers for geolocation
    }
  }

  return "unknown"; // iOS Safari — can't know without trying
}

// ── Platform-specific denied guidance ──

export function getDeniedGuidance(): string {
  const standalone = isStandaloneMode();
  const ios = isIOS();

  if (ios && standalone) {
    return "Location is blocked — this app uses Safari's permission.\n1. Open Settings → Privacy & Security → Location Services\n2. Make sure Location Services is ON\n3. Scroll to Safari Websites → set to \"While Using\"\n4. Close and reopen this app";
  }

  if (ios) {
    return "Location is blocked in Safari.\n1. Tap the \"aA\" menu in the address bar\n2. Website Settings → Location → Allow\n3. If still blocked: Settings → Privacy & Security → Location Services → Safari Websites → \"While Using\"";
  }

  if (standalone) {
    return "Location is blocked.\n1. Open browser settings → Site Settings → Location\n2. Allow this site\n3. Reopen the app";
  }

  // Desktop / Android browser
  return "Location is blocked.\n1. Tap the lock/info icon in the address bar\n2. Site settings → Location → Allow\n3. Refresh the page";
}

export function getUnavailableGuidance(): string {
  if (isIOS()) {
    return "Location Services are off.\n1. Open Settings → Privacy & Security → Location Services\n2. Turn Location Services ON\n3. Scroll to Safari Websites → \"While Using\"";
  }
  return "Location is unavailable.\n1. Enable Location Services in device settings\n2. Try again";
}
