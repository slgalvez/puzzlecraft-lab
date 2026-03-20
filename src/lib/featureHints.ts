/** Lightweight localStorage-based feature hint & banner tracking */

const BANNER_KEY = "private_whats_new_dismissed";
const HINT_KEY_PREFIX = "private_hint_seen_";

// Bump this version string when new features are added to the banner
export const WHATS_NEW_VERSION = "2026-03-v1";

export const WHATS_NEW_FEATURES = [
  "Voice messages",
  "Video calls",
  "GIFs",
  "Custom colors",
];

// ── Banner ──

export function isBannerDismissed(): boolean {
  return localStorage.getItem(BANNER_KEY) === WHATS_NEW_VERSION;
}

export function dismissBanner(): void {
  localStorage.setItem(BANNER_KEY, WHATS_NEW_VERSION);
}

// ── Contextual hints ──

export type HintId =
  | "voice_record"
  | "video_call"
  | "emoji_reaction"
  | "custom_color";

export function isHintSeen(id: HintId): boolean {
  return localStorage.getItem(`${HINT_KEY_PREFIX}${id}`) === "1";
}

export function markHintSeen(id: HintId): void {
  localStorage.setItem(`${HINT_KEY_PREFIX}${id}`, "1");
}
