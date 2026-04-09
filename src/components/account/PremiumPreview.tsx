/**
 * PremiumPreview.tsx  ← FULL REPLACEMENT
 * src/components/account/PremiumPreview.tsx
 *
 * CHANGES FROM PREVIOUS VERSION:
 *
 * The previous version had convincing fake data:
 *   - Rating "742" with "+18" delta
 *   - "#24" leaderboard rank
 *   - Accuracy "94%" / "97%"
 *   - Personal bests "2:14" / "3:08" / "1:42"
 *   - Named leaderboard entries: "PuzzleMaster", "GridNinja", "WordSmith"
 *
 * These looked REAL through blur-[7px] opacity-60. Users who briefly saw
 * the non-premium view (loading flash, entitlement race) treated these as
 * their own data.
 *
 * FIX: Replaced all fake-but-realistic values with clearly abstract visuals:
 *   - Rating shows "—" not a number
 *   - Bars/progress indicators instead of precise percentages
 *   - Personal bests show placeholder dashes, not specific times
 *   - Leaderboard shows abstract rows, no real-looking names or ratings
 *   - Added explicit "Preview" badge so intent is unmistakable
 *   - Blur increased to blur-[12px] so values genuinely cannot be read
 *
 * These cards remain blurred as marketing teasers. They show SHAPE, not DATA.
 */

import { Shield, Target, Trophy, TrendingUp, BarChart3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

// ── Abstract preview cards (SHAPE only — no fake personal stats) ──────────

function RatingCard() {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp size={14} className="text-primary" />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Your Rank</span>
      </div>
      {/* Abstract colored blocks instead of fake numbers */}
      <div className="h-8 w-16 rounded bg-emerald-500/20 mb-2" />
      <div className="h-5 w-24 rounded bg-muted/60 mb-3" />
      <div className="mt-2.5 max-w-40">
        <div className="h-1.5 w-full rounded-full bg-primary/20 overflow-hidden">
          <div className="h-full w-3/5 rounded-full bg-primary/40" />
        </div>
        <div className="mt-1 h-3 w-28 rounded bg-muted/40" />
      </div>
    </div>
  );
}

function AccuracyCard() {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Target size={14} className="text-primary" />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Accuracy</span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div>
          <div className="h-7 w-12 rounded bg-muted/60 mx-auto mb-1" />
          <div className="h-2.5 w-10 rounded bg-muted/40 mx-auto" />
        </div>
        <div>
          <div className="h-7 w-12 rounded bg-muted/60 mx-auto mb-1" />
          <div className="h-2.5 w-10 rounded bg-muted/40 mx-auto" />
        </div>
      </div>
    </div>
  );
}

function PersonalBestsCard() {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Trophy size={14} className="text-primary" />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Personal Bests</span>
      </div>
      {/* Abstract rows — no fake times */}
      <div className="space-y-2">
        {[80, 60, 72].map((w, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <div className={`h-2.5 rounded bg-muted/50`} style={{ width: `${w}%` }} />
            <div className="h-2.5 w-10 rounded bg-primary/20 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

function LeaderboardMiniCard() {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Shield size={14} className="text-primary" />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Leaderboard</span>
      </div>
      {/* Abstract rows — no fake names or ratings */}
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-2.5 w-4 rounded bg-muted/60 shrink-0" />
            <div className="h-2.5 flex-1 rounded bg-muted/40" />
            <div className="h-2.5 w-8 rounded bg-primary/20 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

function MilestonesCard() {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 size={14} className="text-primary" />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Insights</span>
      </div>
      <div className="space-y-2">
        {[85, 60, 45].map((w, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary/30 shrink-0" />
            <div className="h-2.5 rounded bg-muted/40" style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Exports ───────────────────────────────────────────────────────────────

/** Stats page: blurred preview with upgrade CTA. Shown only to non-Plus users. */
export function StatsPremiumPreview({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="mt-12 space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-sm font-semibold text-muted-foreground/70 uppercase tracking-wider">
          Advanced Performance
        </h2>
        {/* Unmistakable preview label */}
        <span className="rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary">
          Preview
        </span>
      </div>

      <div className="relative rounded-2xl overflow-hidden">
        {/* Blurred abstract cards — not readable, not personal */}
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 blur-[12px] opacity-50 pointer-events-none select-none"
          aria-hidden
        >
          <RatingCard />
          <AccuracyCard />
          <PersonalBestsCard />
        </div>

        {/* Upgrade overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/30 backdrop-blur-[1px]">
          <p className="text-sm text-foreground font-medium text-center px-4">
            Unlock Puzzlecraft+ to track your performance
          </p>
          <button
            onClick={onUpgrade}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors border border-primary/30 rounded-full px-4 py-1.5 hover:bg-primary/5"
          >
            View Puzzlecraft+
          </button>
        </div>
      </div>
    </div>
  );
}

/** Account/login page: light teaser with no CTA, just feature shapes. */
export function LoginPremiumPreview() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-2">
        <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-widest">
          What you unlock with Puzzlecraft+
        </p>
      </div>
      <div className="relative rounded-xl overflow-hidden">
        <div
          className="grid grid-cols-3 gap-2 blur-[10px] opacity-40 pointer-events-none select-none"
          aria-hidden
        >
          <RatingCard />
          <LeaderboardMiniCard />
          <MilestonesCard />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] text-muted-foreground/60 font-medium">
            Coming soon
          </span>
        </div>
      </div>
    </div>
  );
}
