/**
 * Puzzlecraft+ access control
 *
 * Central config for premium feature gating.
 * - LAUNCHED: flip to true when Puzzlecraft+ goes public
 * - hasPremiumAccess: returns true if the user can use premium features
 *   (admin always can; regular users only when launched AND subscribed)
 */

/** Set to true when Puzzlecraft+ is publicly available for purchase */
export const PUZZLECRAFT_PLUS_LAUNCHED = false;

/**
 * Determine whether the current user can access premium features.
 * Admins always have access regardless of launch state.
 */
export function hasPremiumAccess(opts: {
  isAdmin: boolean;
  subscribed: boolean;
}): boolean {
  if (opts.isAdmin) return true;
  return PUZZLECRAFT_PLUS_LAUNCHED && opts.subscribed;
}

/**
 * Whether the upgrade CTA should be shown to this user.
 * Hidden for admins (they already have access) and hidden pre-launch for regular users.
 */
export function shouldShowUpgradeCTA(opts: {
  isAdmin: boolean;
  subscribed: boolean;
}): boolean {
  if (opts.isAdmin) return false;
  if (opts.subscribed) return false;
  return PUZZLECRAFT_PLUS_LAUNCHED;
}
