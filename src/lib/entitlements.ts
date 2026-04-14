/**
 * entitlements.ts
 * src/lib/entitlements.ts
 *
 * Pure entitlement resolution — no React, no hooks.
 * Single source of truth for determining Puzzlecraft+ access source.
 *
 * Resolution order:
 *   1. is_admin = true           → admin_grant (no expiry)
 *   2. platform = 'admin_grant'  → admin_grant (no expiry, DB-trigger protected)
 *   3. subscribed + valid expiry → stripe
 *   4. otherwise                 → none
 */

export type EntitlementSource = "stripe" | "admin_grant" | "none";

export interface EntitlementResult {
  hasPlus: boolean;
  source: EntitlementSource;
  expiresAt: string | null;
}

export interface EntitlementProfile {
  subscribed: boolean;
  subscription_platform: string | null;
  subscription_expires_at: string | null;
  is_admin: boolean;
}

export function resolveEntitlement(profile: EntitlementProfile | null): EntitlementResult {
  const NONE: EntitlementResult = { hasPlus: false, source: "none", expiresAt: null };
  if (!profile) return NONE;

  // 1. Admin flag → always granted
  if (profile.is_admin) {
    return { hasPlus: true, source: "admin_grant", expiresAt: null };
  }

  // 2. Admin-granted subscription (protected by DB trigger)
  if (profile.subscription_platform === "admin_grant" && profile.subscribed) {
    return { hasPlus: true, source: "admin_grant", expiresAt: null };
  }

  // 3. Active paid subscription
  if (profile.subscribed) {
    const expiresAt = profile.subscription_expires_at;
    if (!expiresAt || new Date(expiresAt) > new Date()) {
      return {
        hasPlus: true,
        source: (profile.subscription_platform as EntitlementSource) || "stripe",
        expiresAt: expiresAt ?? null,
      };
    }
  }

  return NONE;
}
