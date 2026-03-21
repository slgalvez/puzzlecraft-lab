import { Shield, Target, Trophy, TrendingUp, BarChart3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

/** Fake data cards shown blurred to tease Puzzlecraft+ features */

function RatingCard() {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp size={14} className="text-primary" />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Your Rank</span>
        <span className="font-mono font-bold text-xs text-primary">#24</span>
      </div>
      <p className="text-sm font-semibold text-emerald-500">Skilled</p>
      <div className="flex items-baseline gap-1.5 mt-1">
        <span className="font-mono text-2xl font-bold text-foreground">742</span>
        <span className="text-[10px] text-muted-foreground">Rating</span>
        <span className="text-[10px] font-semibold text-emerald-500 inline-flex items-center gap-0.5">
          <TrendingUp size={8} />+18
        </span>
      </div>
      <div className="mt-2.5 max-w-40">
        <Progress value={62} className="h-1.5" />
        <p className="mt-1 text-[9px] text-muted-foreground">208 points to Advanced</p>
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
          <p className="font-mono text-lg font-bold text-foreground">94%</p>
          <p className="text-[9px] text-muted-foreground">Overall</p>
        </div>
        <div>
          <p className="font-mono text-lg font-bold text-foreground">97%</p>
          <p className="text-[9px] text-muted-foreground">Last 10</p>
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
      <div className="space-y-1.5">
        {[
          { label: "Crossword", time: "2:14" },
          { label: "Sudoku", time: "3:08" },
          { label: "Word Search", time: "1:42" },
        ].map((r) => (
          <div key={r.label} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{r.label}</span>
            <span className="font-mono font-semibold text-foreground">{r.time}</span>
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
      <div className="space-y-1">
        {[
          { rank: 1, name: "PuzzleMaster", rating: 1350 },
          { rank: 2, name: "GridNinja", rating: 1180 },
          { rank: 3, name: "WordSmith", rating: 1020 },
        ].map((e) => (
          <div key={e.rank} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">#{e.rank} {e.name}</span>
            <span className="font-mono font-semibold text-foreground">{e.rating}</span>
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
        <Flame size={14} className="text-primary" />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Milestones</span>
      </div>
      <div className="space-y-1.5">
        {["First 10 Solves", "7-Day Streak", "Speed Demon"].map((m) => (
          <div key={m} className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-full bg-primary/30" />
            {m}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Stats page: blurred preview with overlay CTA */
export function StatsPremiumPreview({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="mt-12 space-y-3">
      <h2 className="font-display text-sm font-semibold text-muted-foreground/70 uppercase tracking-wider">
        Advanced Performance (Preview)
      </h2>
      <div className="relative rounded-2xl overflow-hidden">
        {/* Blurred cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 blur-[7px] opacity-60 pointer-events-none select-none" aria-hidden>
          <RatingCard />
          <AccuracyCard />
          <PersonalBestsCard />
        </div>
        {/* Overlay */}
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

/** Login page: lighter preview — no CTA button, just teaser */
export function LoginPremiumPreview() {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-widest text-center">
        What you unlock with Puzzlecraft+
      </p>
      <div className="relative rounded-xl overflow-hidden">
        <div className="grid grid-cols-3 gap-2 blur-[5px] opacity-50 pointer-events-none select-none" aria-hidden>
          <RatingCard />
          <LeaderboardMiniCard />
          <MilestonesCard />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-[10px] text-muted-foreground/60 font-medium">
            Coming soon
          </p>
        </div>
      </div>
    </div>
  );
}
