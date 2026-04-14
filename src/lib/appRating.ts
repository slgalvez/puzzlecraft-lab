/**
 * App Store rating prompt — native only, silent fallback on web.
 * Uses dynamic import so the project compiles without the plugin installed.
 */

const COOLDOWN_KEY = "puzzlecraft_rating_last";
const COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

interface RatingInput {
  solveCount: number;
  isNewBest: boolean;
  streakLength: number;
}

export async function maybeRequestRating({ solveCount, isNewBest, streakLength }: RatingInput) {
  // Gate: need 5+ solves
  if (solveCount < 5) return;

  // Gate: must be a "delight moment" — PB or streak milestone
  const isStreakMilestone = streakLength > 0 && streakLength % 7 === 0;
  if (!isNewBest && !isStreakMilestone) return;

  // Gate: 90-day cooldown
  const last = localStorage.getItem(COOLDOWN_KEY);
  if (last && Date.now() - Number(last) < COOLDOWN_MS) return;

  try {
    const { InAppReview } = await import("@nicepng/capacitor-in-app-review" as any).catch(() =>
      import("@nicepng/capacitor-in-app-review" as any)
    ).catch(() => ({ InAppReview: null }));

    if (!InAppReview?.requestReview) return;

    await InAppReview.requestReview();
    localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
  } catch {
    // Silent — plugin not installed or web environment
  }
}
