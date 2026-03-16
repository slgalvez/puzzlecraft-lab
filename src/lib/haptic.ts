/** Trigger a short haptic vibration on supported devices (mobile). */
export function haptic(duration = 10) {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(duration);
  }
}
