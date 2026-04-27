/**
 * Master switches for hiding incomplete features from end users.
 * Internals (routes, generators, DB, admin tooling) stay functional
 * even when these flags are off.
 */

// Hide all user-facing Weekly Pack entry points + copy.
// Direct deep links via /quick-play?pack=... and /admin-preview remain functional.
export const WEEKLY_PACKS_VISIBLE = false;
