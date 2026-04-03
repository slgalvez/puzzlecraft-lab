/**
 * useOnboarding.ts
 * src/hooks/useOnboarding.ts
 *
 * Tracks whether the user has completed onboarding.
 * Uses localStorage so it persists across app restarts.
 * Once dismissed, never shows again unless explicitly reset (e.g. fresh install).
 */

import { useState, useCallback } from "react";

const ONBOARDING_KEY = "puzzlecraft_onboarding_complete";
const ONBOARDING_VERSION = "1"; // bump this to force re-show after major updates

export function useOnboarding() {
  const [isDone, setIsDone] = useState<boolean>(() => {
    try {
      return localStorage.getItem(ONBOARDING_KEY) === ONBOARDING_VERSION;
    } catch {
      return false;
    }
  });

  const completeOnboarding = useCallback(() => {
    try {
      localStorage.setItem(ONBOARDING_KEY, ONBOARDING_VERSION);
    } catch {
      // storage full — silently fail, don't block the user
    }
    setIsDone(true);
  }, []);

  const resetOnboarding = useCallback(() => {
    try {
      localStorage.removeItem(ONBOARDING_KEY);
    } catch {}
    setIsDone(false);
  }, []);

  return { onboardingComplete: isDone, completeOnboarding, resetOnboarding };
}
