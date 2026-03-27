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
    return "Location is blocked for this app. Go to Settings → Privacy & Security → Location Services → find this app and set to \"While Using\".";
  }

  if (ios) {
    return "Location is blocked. In Safari, tap the \"aA\" menu → Website Settings → Location, and set to \"Allow\". Also check Settings → Privacy & Security → Location Services is on.";
  }

  if (standalone) {
    return "Location is blocked for this app. Open your browser settings → Site Settings → Location, and allow this site. Then reopen the app.";
  }

  // Desktop / Android browser
  return "Location is blocked. Click the lock/info icon in your address bar → Site settings → Location → Allow. Then refresh the page.";
}

export function getUnavailableGuidance(): string {
  if (isIOS()) {
    return "Location Services are turned off. Go to Settings → Privacy & Security → Location Services and turn them on.";
  }
  return "Location is unavailable. Make sure Location Services are enabled in your device settings and try again.";
}
