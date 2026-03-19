import type { NavigateFunction } from "react-router-dom";

const NAV_COUNT_KEY = "app_nav_count";

/** Call on every location change to track in-app navigation depth. */
export function trackNavigation() {
  const count = parseInt(sessionStorage.getItem(NAV_COUNT_KEY) || "0", 10);
  sessionStorage.setItem(NAV_COUNT_KEY, (count + 1).toString());
}

/**
 * Navigate back if there's a previous in-app page, otherwise go to fallback.
 */
export function goBackOrFallback(navigate: NavigateFunction, fallback = "/") {
  const count = parseInt(sessionStorage.getItem(NAV_COUNT_KEY) || "0", 10);
  if (count > 1) {
    navigate(-1);
  } else {
    navigate(fallback, { replace: true });
  }
}
