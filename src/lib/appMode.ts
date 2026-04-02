import { Capacitor } from '@capacitor/core';

/**
 * Returns true when running inside the native iOS/Android shell.
 *
 * Uses two checks for resilience with remote-URL Capacitor setups:
 * 1. The @capacitor/core SDK check (reads window.Capacitor injected by native bridge)
 * 2. A direct window.Capacitor.isNativePlatform fallback for race-condition edge cases
 */
export const isNativeApp = (): boolean => {
  try {
    if (Capacitor.isNativePlatform()) return true;
  } catch {
    // Capacitor SDK not fully loaded — fall through to manual check
  }

  // Direct bridge check — the native shell injects window.Capacitor before page JS runs
  try {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (cap?.isNativePlatform?.()) return true;
  } catch {
    // not available
  }

  return false;
};
