/**
 * use-tablet.ts
 * src/hooks/use-tablet.ts
 *
 * Detects whether the device is a tablet (iPad) specifically.
 *
 * WHY THIS EXISTS:
 * useIsMobile() uses a pixel-width threshold (typically <768px).
 * iPad starts at 768px and goes up — so it reports as "desktop".
 * This causes every puzzle to skip the mobile keyboard-trigger path,
 * leaving the iPad with no keyboard on cell tap.
 *
 * This hook identifies touch-capable devices regardless of screen size.
 * Use it alongside useIsMobile() to make keyboard/input decisions:
 *
 *   const isMobile = useIsMobile();      // phone-sized
 *   const isTablet = useIsTablet();      // iPad / tablet
 *   const needsKeyboardProxy = isMobile || isTablet;
 *
 * Platform detection notes:
 * - iPad Safari (iPadOS 13+): navigator.maxTouchPoints >= 1 AND
 *   navigator.userAgent does NOT include "Mobile" (iPads dropped "iPad"
 *   from UA in iPadOS 13 to match desktop Safari)
 * - iPad Safari (older): userAgent includes "iPad"
 * - Capacitor webview on iPad: userAgent includes "iPad" or touch points
 * - Android tablet: touch-capable + large screen
 */

import { useMemo } from "react";

/**
 * Returns true if the current device is touch-capable but NOT a phone.
 * Covers: iPad (all generations), Android tablets, Surface touch mode.
 *
 * This is deliberately broader than "iPad only" — any large touch screen
 * should get the keyboard-proxy input path.
 */
export function useIsTablet(): boolean {
  return useMemo(() => isTabletDevice(), []);
}

/**
 * Returns true if the device needs a keyboard proxy input
 * (i.e. is a touch device — phone OR tablet).
 * Use this for input/keyboard routing decisions.
 */
export function useNeedsKeyboardProxy(): boolean {
  return useMemo(() => isTouchDevice(), []);
}

// ── Detection helpers ─────────────────────────────────────────────────────

/**
 * Touch capable device of any size.
 * Safe to call at module init time (no window required).
 */
export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    navigator.maxTouchPoints > 0 ||
    ("ontouchstart" in window)
  );
}

/**
 * iPad / tablet specifically (touch-capable but larger than a phone).
 * Uses a combination of touch detection and screen width to avoid
 * misidentifying phones.
 */
export function isTabletDevice(): boolean {
  if (typeof window === "undefined") return false;

  const ua    = navigator.userAgent;
  const touch = isTouchDevice();

  // Explicit iPad UA (iPadOS 12 and earlier, and some Capacitor builds)
  if (/iPad/.test(ua)) return true;

  // iPadOS 13+ dropped "iPad" from UA — detect by touch + macOS-like UA
  // iPadOS uses "Macintosh" in UA but has touch support
  if (/Macintosh/.test(ua) && touch) return true;

  // Android tablet: touch + large screen, no "Mobile" in UA
  if (/Android/.test(ua) && !/Mobile/.test(ua) && touch) return true;

  // Generic large touch screen (Surface, etc.)
  const screenW = Math.max(window.screen.width, window.screen.height);
  if (touch && screenW >= 768 && !/Mobile/.test(ua)) return true;

  return false;
}