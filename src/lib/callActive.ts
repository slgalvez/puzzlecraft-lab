/**
 * Module-level flag indicating whether a video call is currently active.
 * Also stores a short session-scoped grace window so iOS permission sheets
 * for camera/mic don't trip focus-loss protection during call setup.
 */
let active = false;
const CALL_SETUP_GRACE_KEY = "private_call_setup_until";
const CALL_SETUP_GRACE_MS = 15_000;

export function setCallActive(value: boolean) {
  active = value;

  try {
    if (value) {
      sessionStorage.setItem(
        CALL_SETUP_GRACE_KEY,
        String(Date.now() + CALL_SETUP_GRACE_MS),
      );
    } else {
      sessionStorage.removeItem(CALL_SETUP_GRACE_KEY);
    }
  } catch {
    // Ignore storage access issues in non-browser contexts
  }
}

export function isCallActive(): boolean {
  if (active) return true;

  try {
    const expiresAt = Number(sessionStorage.getItem(CALL_SETUP_GRACE_KEY) || "0");
    if (expiresAt > Date.now()) return true;
    if (expiresAt) sessionStorage.removeItem(CALL_SETUP_GRACE_KEY);
  } catch {
    // Ignore storage access issues in non-browser contexts
  }

  return false;
}
