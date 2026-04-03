/**
 * useBackDestination.ts
 * Tracks where the user came from so back buttons always go
 * to the right place — Play tab, Daily, Craft inbox, etc.
 */

import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

const BACK_KEY = "puzzlecraft_back_destination";

interface BackDestination {
  path: string;
  label: string;
}

const DEFAULTS: BackDestination = { path: "/", label: "Play" };

/** Call this BEFORE navigating to a puzzle page */
export function setBackDestination(path: string, label: string) {
  try {
    sessionStorage.setItem(BACK_KEY, JSON.stringify({ path, label }));
  } catch {}
}

/** Read the stored destination (used inside puzzle/grid components) */
export function getBackDestination(): BackDestination {
  try {
    const raw = sessionStorage.getItem(BACK_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as BackDestination;
    if (!parsed.path || !parsed.label) return DEFAULTS;
    return parsed;
  } catch {
    return DEFAULTS;
  }
}

/** Hook: provides backPath, backLabel, and a goBack() function */
export function useBackDestination() {
  const navigate = useNavigate();
  const dest = getBackDestination();

  const goBack = useCallback(() => {
    try { sessionStorage.removeItem(BACK_KEY); } catch {}
    navigate(dest.path);
  }, [navigate, dest.path]);

  return {
    backPath: dest.path,
    backLabel: dest.label,
    goBack,
  };
}
