/**
 * WeeklyPackSection.tsx  ← NEW FILE
 * src/components/puzzles/WeeklyPackSection.tsx
 *
 * Shows the WeeklyPackCard on desktop/web — it was previously only
 * rendered inside IOSPlayTab (mobile-only component).
 *
 * This section renders correctly on:
 *  - Desktop (full-width card with progress)
 *  - Mobile web (same card, full width)
 *  - PWA
 *  - iOS (where IOSPlayTab already handles it — use the guard below)
 *
 * Usage in PuzzleLibrary.tsx — add after SavedPuzzlesSection:
 *   import { WeeklyPackSection } from "@/components/puzzles/WeeklyPackSection";
 *   <WeeklyPackSection />
 *
 * Usage in Index.tsx — add to types section:
 *   import { WeeklyPackSection } from "@/components/puzzles/WeeklyPackSection";
 *   <WeeklyPackSection compact />
 */

import { isNativeApp } from "@/lib/appMode";
import { WeeklyPackCard } from "@/components/ios/WeeklyPackCard";
import { WEEKLY_PACKS_VISIBLE } from "@/lib/featureFlags";

interface WeeklyPackSectionProps {
  /** Compact mode: no section header, card only */
  compact?: boolean;
}

export function WeeklyPackSection({ compact = false }: WeeklyPackSectionProps) {
  // Feature temporarily hidden from all user-facing surfaces.
  if (!WEEKLY_PACKS_VISIBLE) return null;
  // Native iOS app already renders this in IOSPlayTab — skip to avoid duplication
  if (isNativeApp()) return null;

  if (compact) {
    return (
      <div className="mt-5">
        <WeeklyPackCard />
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
          This week
        </h2>
      </div>
      <WeeklyPackCard />
    </div>
  );
}
