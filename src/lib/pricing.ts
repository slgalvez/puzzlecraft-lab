/**
 * pricing.ts
 * src/lib/pricing.ts
 *
 * ═══════════════════════════════════════════════════════════════
 * SINGLE SOURCE OF TRUTH FOR ALL PUZZLECRAFT+ PRICING
 * ═══════════════════════════════════════════════════════════════
 *
 * Import from here in every component that displays pricing.
 * Never hardcode prices directly in components.
 *
 * To update pricing for launch:
 *   1. Change the values here
 *   2. Every card, modal, and banner updates automatically
 */

/** Monthly subscription price */
export const MONTHLY_PRICE = "$2.99";

/** Annual subscription price */
export const ANNUAL_PRICE = "$19.99";

/**
 * Saving percentage when choosing annual over monthly.
 * $2.99 × 12 = $35.88/year vs $19.99/year → 44% saving
 */
export const ANNUAL_SAVING_PCT = "44%";

/** Free trial length in days */
export const TRIAL_DAYS = 7;

/** Monthly equivalent of annual (for display: "just $1.67/mo") */
export const ANNUAL_MONTHLY_EQUIV = "$1.67";

/**
 * Formatted display strings — use these in UI copy.
 */
export const PRICING = {
  monthly:          `${MONTHLY_PRICE}/month`,
  annual:           `${ANNUAL_PRICE}/year`,
  annualSaving:     `Save ${ANNUAL_SAVING_PCT}`,
  annualEquiv:      `${ANNUAL_MONTHLY_EQUIV}/mo billed annually`,
  trial:            `${TRIAL_DAYS}-day free trial`,
  inline:           `${MONTHLY_PRICE}/month · ${ANNUAL_PRICE}/year`,
} as const;
