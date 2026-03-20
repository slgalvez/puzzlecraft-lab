/** Trigger a short haptic vibration on supported devices (mobile). */
export function haptic(duration = 10) {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(duration);
  }
}

/** Very light tap — tab switches, minor interactions */
export function hapticLight() { haptic(6); }

/** Standard tap — sends, opens, confirmations */
export function hapticTap() { haptic(12); }

/** Medium tap — calls, important actions */
export function hapticMedium() { haptic(20); }

/** Stronger tap — long-press, reaction menu */
export function hapticStrong() { haptic(30); }

/** Success pattern — puzzle solve, achievement */
export function hapticSuccess() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate([12, 60, 12]);
  }
}
