/**
 * Module-level flag indicating whether a video call is currently active.
 * Used by focus-loss protection to avoid killing the session mid-call.
 */
let active = false;

export function setCallActive(value: boolean) {
  active = value;
}

export function isCallActive(): boolean {
  return active;
}
