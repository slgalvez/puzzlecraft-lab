import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { buildSolveResultShareText } from "@/lib/craftShare";
import { buildCraftShareText as buildUnifiedCraftShareText, buildSolveShareText, buildDailyShareText } from "@/lib/shareText";
import { MILESTONE_ICON_EMOJI } from "@/lib/milestones";
import Layout from "@/components/layout/Layout";
import CompletionPanel from "@/components/puzzles/CompletionPanel";
import MilestoneModal, { type MilestoneToShow } from "@/components/puzzles/MilestoneModal";
import PremiumStats from "@/components/account/PremiumStats";
import { StatsPremiumPreview, LoginPremiumPreview } from "@/components/account/PremiumPreview";
import PremiumLockedCard from "@/components/account/PremiumLockedCard";
import UpgradeModal from "@/components/account/UpgradeModal";
import UpgradeModalNextUI from "@/components/account/UpgradeModalNextUI";

import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import CraftThemePicker from "@/components/craft/CraftThemePicker";
import { ActivityCalendar } from "@/components/stats/ActivityCalendar";
import { WeeklyPackCard } from "@/components/ios/WeeklyPackCard";
import { DailyLeaderboard } from "@/components/ios/DailyLeaderboard";
import { StreakShieldBanner } from "@/components/ios/StreakShieldBanner";
import { PremiumGate, PremiumBadge, PremiumLockRow } from "@/components/premium/PremiumGate";
import type { MilestoneIcon } from "@/lib/milestones";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Trophy, Flame, Target, Medal, Zap, Crown, Award, Star, Puzzle, Clock, Users, Bell, Smartphone, Eye, Shield, Sparkles, X, ChevronRight, Play } from "lucide-react";
import { generateNonogram } from "@/lib/generators/nonogram";
import { SCHEDULED_OVERRIDES, type PackOverride } from "@/lib/packOverrides";
import { type WeeklyPack, type PackPuzzle } from "@/lib/weeklyPacks";
import { generateCrossword } from "@/lib/generators/crosswordGen";
import { generateSudoku } from "@/lib/generators/sudoku";
import { generateWordSearch } from "@/lib/generators/wordSearch";
import { generateCryptogram } from "@/lib/generators/cryptogram";
import { generateWordFillIn } from "@/lib/generators/fillGen";
import { WORD_CLUES } from "@/lib/wordList";
import type { Difficulty } from "@/lib/puzzleTypes";
import { ProvisionalRatingCard } from "@/components/puzzles/ProvisionalRatingCard";
import { TierUpCelebration } from "@/components/puzzles/TierUpCelebration";
import type { PlayerRatingInfo, SkillTier } from "@/lib/solveScoring";
import { getTierBadgeStyle } from "@/lib/solveScoring";

// ── Icon map ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_MAP: Record<MilestoneIcon, any> = {
  puzzle: Puzzle, flame: Flame, trophy: Trophy, medal: Medal,
  zap: Zap, crown: Crown, target: Target, award: Award, bolt: Zap,
};

const CONFETTI_COLORS = [
  "bg-primary", "bg-amber-400", "bg-emerald-400",
  "bg-sky-400", "bg-pink-400", "bg-violet-400",
];

const ALL_MILESTONES: { id: string; label: string; icon: MilestoneIcon; target: number; category: string }[] = [
  { id: "solves-10", label: "10 Puzzles Solved", icon: "puzzle", target: 10, category: "Solves" },
  { id: "solves-50", label: "50 Puzzles Solved", icon: "flame", target: 50, category: "Solves" },
  { id: "solves-100", label: "100 Puzzles Solved", icon: "trophy", target: 100, category: "Solves" },
  { id: "solves-250", label: "250 Puzzles Solved", icon: "medal", target: 250, category: "Solves" },
  { id: "streak-3", label: "3-Day Streak", icon: "flame", target: 3, category: "Streaks" },
  { id: "streak-7", label: "7-Day Streak", icon: "zap", target: 7, category: "Streaks" },
  { id: "streak-14", label: "14-Day Streak", icon: "bolt", target: 14, category: "Streaks" },
  { id: "streak-30", label: "30-Day Streak", icon: "crown", target: 30, category: "Streaks" },
  { id: "tier-skilled", label: "Skilled Rank", icon: "target", target: 700, category: "Tier" },
  { id: "tier-advanced", label: "Advanced Rank", icon: "award", target: 950, category: "Tier" },
  { id: "tier-expert", label: "Expert Rank", icon: "medal", target: 1200, category: "Tier" },
];

const MOCK_MILESTONES: MilestoneToShow[] = [
  { id: "solves-10", label: "10 Puzzles Solved", icon: "puzzle" },
  { id: "streak-7", label: "7-Day Streak", icon: "flame" },
  { id: "tier-skilled", label: "Skilled Rank Reached", icon: "target" },
];

const ICON_OPTIONS: MilestoneIcon[] = ["puzzle", "flame", "trophy", "medal", "zap", "crown", "target", "award", "bolt"];

// ── Shared sub-components ──────────────────────────────────────────────────

function ConfettiParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
      {Array.from({ length: 12 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "absolute w-1.5 h-1.5 rounded-full opacity-0",
            CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          )}
          style={{
            left: `${15 + Math.random() * 70}%`,
            top: `${10 + Math.random() * 30}%`,
            animation: `milestone-confetti-pop 0.8s ease-out ${i * 0.05}s forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes milestone-confetti-pop {
          0% { opacity: 0; transform: scale(0) translateY(0); }
          30% { opacity: 1; transform: scale(1.2) translateY(-8px); }
          100% { opacity: 0; transform: scale(0.6) translateY(20px) rotate(${Math.random() > 0.5 ? '' : '-'}120deg); }
        }
      `}</style>
    </div>
  );
}

function NonogramMiniGrid({ solution }: { solution: boolean[][] }) {
  const size = solution.length;
  const cellPx = Math.max(2, Math.min(6, Math.floor(60 / size)));
  return (
    <div
      className="border border-border/20 rounded"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${size}, ${cellPx}px)`,
        gridTemplateRows: `repeat(${size}, ${cellPx}px)`,
        gap: 0,
      }}
    >
      {solution.flat().map((filled, i) => (
        <div
          key={i}
          className={filled ? "bg-foreground" : "bg-transparent"}
          style={{ width: cellPx, height: cellPx }}
        />
      ))}
    </div>
  );
}

// ── Share messages ─────────────────────────────────────────────────────────

const SHARE_MESSAGES = [
  {
    label: "Daily Challenge Result (unified)",
    description: "Uses buildDailyShareText from shareText.ts",
    text: buildDailyShareText({
      typeName: "Crossword",
      difficulty: "medium",
      time: 272,
      streak: 7,
      rank: 2,
      total: 14,
      shareUrl: "https://puzzlecraft-lab.lovable.app/play?code=daily-2026-04-03",
    }),
  },
  {
    label: "Puzzle Result — Personal Best (unified)",
    description: "Uses buildSolveShareText with PB context",
    text: buildSolveShareText({
      type: "sudoku",
      difficulty: "hard",
      time: 725,
      seed: 307144639,
      isDaily: false,
      isPB: true,
      prevBest: 748,
      improvement: 23,
      score: 1280,
      tier: "Advanced",
    }).text,
  },
  {
    label: "Crafted Puzzle (with challenge time)",
    description: "Uses buildCraftShareText from shareText.ts",
    text: buildUnifiedCraftShareText({ title: "Birthday Brain Teaser", from: "Alex", url: "https://puzzlecraft-lab.lovable.app/s/abc123-craft-id", type: "crossword", creatorSolveTime: 202 }),
  },
  {
    label: "Crafted Puzzle (no challenge)",
    description: "Uses buildCraftShareText from shareText.ts",
    text: buildUnifiedCraftShareText({ from: "Jordan", url: "https://puzzlecraft-lab.lovable.app/s/xyz789-craft-id", type: "word-search" }),
  },
  {
    label: "Solve Result (beat creator)",
    description: "Uses buildSolveResultShareText from craftShare.ts (backward compat)",
    text: buildSolveResultShareText("Birthday Brain Teaser", "crossword", 185, 202, "https://puzzlecraft-lab.lovable.app/s/abc123-craft-id"),
  },
  {
    label: "Solve Result (missed)",
    description: "Uses buildSolveResultShareText from craftShare.ts (backward compat)",
    text: buildSolveResultShareText("Weekend Challenge", "cryptogram", 310, 245, "https://puzzlecraft-lab.lovable.app/s/def456-craft-id"),
  },
];

function ShareMessagePreviews() {
  return (
    <section className="space-y-3 rounded-xl border border-border/30 p-4">
      <h2 className="text-sm font-semibold text-foreground">Share Message Previews</h2>
      <p className="text-xs text-muted-foreground">
        Sample messages as they appear when shared via iMessage, WhatsApp, etc.
      </p>
      <div className="space-y-4">
        {SHARE_MESSAGES.map((msg) => (
          <div key={msg.label} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">{msg.label}</span>
              <span className="text-[10px] text-muted-foreground/60">{msg.description}</span>
            </div>
            <div className="max-w-sm ml-auto">
              <div className="rounded-2xl rounded-br-md bg-[#007AFF] text-white px-4 py-2.5 text-sm whitespace-pre-line leading-relaxed shadow-sm">
                {msg.text}
              </div>
              <p className="text-[9px] text-muted-foreground/50 text-right mt-0.5 mr-1">iMessage</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Nonogram preview ──────────────────────────────────────────────────────

const NONOGRAM_DIFFICULTIES = [
  { label: "5×5", value: "easy" as const },
  { label: "10×10", value: "medium" as const },
  { label: "15×15", value: "hard" as const },
  { label: "20×20", value: "extreme" as const },
  { label: "25×25", value: "insane" as const },
];

function NonogramPreview() {
  const [page, setPage] = useState(0);
  const [difficulty, setDifficulty] = useState<string>("easy");
  const perPage = 20;

  const puzzles = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => {
      const p = generateNonogram(i + 1, difficulty as any);
      return { seed: i + 1, solution: p.solution };
    });
  }, [difficulty]);

  useEffect(() => { setPage(0); }, [difficulty]);

  const totalPages = Math.ceil(puzzles.length / perPage);
  const visible = puzzles.slice(page * perPage, (page + 1) * perPage);
  const currentLabel = NONOGRAM_DIFFICULTIES.find(d => d.value === difficulty)?.label ?? "5×5";

  return (
    <section className="space-y-3 rounded-xl border border-border/30 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Nonogram Patterns</h2>
        <p className="text-xs text-muted-foreground">{puzzles.length} patterns · {currentLabel}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {NONOGRAM_DIFFICULTIES.map((d) => (
          <Button
            key={d.value}
            size="sm"
            variant={difficulty === d.value ? "default" : "outline"}
            className="text-xs h-7 px-3"
            onClick={() => setDifficulty(d.value)}
          >
            {d.label}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
        {visible.map((p) => (
          <div key={p.seed} className="flex flex-col items-center gap-1">
            <NonogramMiniGrid solution={p.solution} />
            <span className="text-[9px] text-muted-foreground/50">#{p.seed}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-2 pt-1">
        <Button size="sm" variant="outline" className="text-xs h-7" disabled={page === 0} onClick={() => setPage(page - 1)}>
          Prev
        </Button>
        <span className="text-xs text-muted-foreground">{page + 1} / {totalPages}</span>
        <Button size="sm" variant="outline" className="text-xs h-7" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
          Next
        </Button>
      </div>
    </section>
  );
}

// ── Leaderboard preview ───────────────────────────────────────────────────

const MOCK_LEADERBOARD = [
  { rank: 1, name: "Sarah", time: 98, emoji: "🥇", highlight: false },
  { rank: 2, name: "You", time: 125, emoji: "🥈", highlight: true },
  { rank: 3, name: "Mike", time: 147, emoji: "🥉", highlight: false },
  { rank: 4, name: "Anonymous", time: 203, emoji: "#4", highlight: false },
  { rank: 5, name: "Jamie", time: 310, emoji: "#5", highlight: false },
];

function formatTimeLb(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
}

function LeaderboardPreview() {
  const [solverCount, setSolverCount] = useState(5);

  return (
    <section className="space-y-3 rounded-xl border border-border/30 p-4">
      <h2 className="text-sm font-semibold text-foreground">Craft Puzzle Mini-Leaderboard</h2>
      <p className="text-xs text-muted-foreground">
        Shown after solving a shared craft puzzle. The solver's row is highlighted.
      </p>
      <div className="flex gap-2 items-center">
        <label className="text-xs text-muted-foreground">Solvers:</label>
        {[2, 3, 5].map((n) => (
          <Button
            key={n}
            size="sm"
            variant={solverCount === n ? "default" : "outline"}
            className="text-xs h-7 px-3"
            onClick={() => setSolverCount(n)}
          >
            {n}
          </Button>
        ))}
      </div>

      <div className="max-w-sm mx-auto">
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy size={14} className="text-primary" />
              <span className="text-sm font-semibold text-foreground">Leaderboard</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Users size={11} />
              {solverCount} solver{solverCount !== 1 ? "s" : ""}
            </div>
          </div>

          <div className="px-4 py-2.5 text-sm font-semibold border-b border-border/40 bg-primary/8 text-primary">
            🥈 You're in second place
          </div>

          <div className="divide-y divide-border/40">
            {MOCK_LEADERBOARD.slice(0, solverCount).map((entry) => (
              <div
                key={entry.rank}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 transition-colors",
                  entry.highlight && "bg-primary/5"
                )}
              >
                <span className={cn(
                  "text-sm font-bold w-7 text-center shrink-0",
                  entry.rank === 1 ? "text-amber-500" :
                  entry.rank === 2 ? "text-slate-400" :
                  entry.rank === 3 ? "text-amber-700/70" :
                  "text-muted-foreground"
                )}>
                  {entry.emoji}
                </span>
                <span className={cn(
                  "flex-1 text-sm truncate min-w-0",
                  entry.highlight ? "font-semibold text-foreground" : "text-foreground/80"
                )}>
                  {entry.name}
                  {entry.highlight && (
                    <span className="ml-1.5 text-[10px] font-normal text-primary">you</span>
                  )}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <Clock size={10} className="text-muted-foreground/60" />
                  <span className={cn(
                    "font-mono text-xs tabular-nums",
                    entry.highlight ? "font-semibold text-foreground" : "text-muted-foreground"
                  )}>
                    {formatTimeLb(entry.time)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-sm mx-auto mt-3">
        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Trophy size={15} className="text-primary" />
            <p className="text-sm font-semibold text-foreground">Join the leaderboard</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter your name so others can see your time. You can stay anonymous.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Your name"
              disabled
              className="flex-1 h-9 rounded-lg border border-input bg-background px-3 text-sm"
            />
            <Button size="sm" className="shrink-0 h-9 px-4">Add me</Button>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Skip — stay anonymous
          </span>
        </div>
      </div>
    </section>
  );
}

// ── Ranking Preview ────────────────────────────────────────────────────────

const TIER_SAMPLES: { tier: SkillTier; rating: number; solveCount: number }[] = [
  { tier: "Beginner", rating: 280, solveCount: 12 },
  { tier: "Casual", rating: 520, solveCount: 18 },
  { tier: "Skilled", rating: 780, solveCount: 30 },
  { tier: "Advanced", rating: 1050, solveCount: 45 },
  { tier: "Expert", rating: 1380, solveCount: 60 },
];

const TIER_UP_SAMPLES: { from: SkillTier; to: SkillTier; rating: number }[] = [
  { from: "Beginner", to: "Casual", rating: 420 },
  { from: "Casual", to: "Skilled", rating: 710 },
  { from: "Skilled", to: "Advanced", rating: 960 },
  { from: "Advanced", to: "Expert", rating: 1210 },
];

function makeMockRatingInfo(tier: SkillTier, rating: number, solveCount: number): PlayerRatingInfo {
  const tierOrder: SkillTier[] = ["Beginner", "Casual", "Skilled", "Advanced", "Expert"];
  const thresholds = [0, 400, 700, 950, 1200, 1800];
  const idx = tierOrder.indexOf(tier);
  const low = thresholds[idx];
  const high = thresholds[idx + 1];
  const progress = Math.round(((rating - low) / (high - low)) * 100);

  return {
    rating,
    tier,
    tierColor: {
      Beginner: "text-muted-foreground",
      Casual: "text-sky-500",
      Skilled: "text-emerald-500",
      Advanced: "text-primary",
      Expert: "text-amber-500",
    }[tier],
    tierProgress: Math.min(100, progress),
    isProvisional: false,
    hasNoData: false,
    solveCount,
    solvesUntilConfirmed: 0,
    solvesUntilLeaderboard: Math.max(0, 10 - solveCount),
    onLeaderboard: solveCount >= 10,
  };
}

function RankingPreview() {
  const [celebrationTier, setCelebrationTier] = useState<typeof TIER_UP_SAMPLES[number] | null>(null);

  return (
    <div className="space-y-6">
      {/* ── Tier Cards ── */}
      <section className="space-y-3 rounded-xl border border-border/30 p-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Zap size={14} /> Tier Rating Cards
        </h2>
        <p className="text-xs text-muted-foreground">
          Each skill tier has distinct visual styling — border, background tint, and badge color.
        </p>
        <div className="space-y-4">
          {TIER_SAMPLES.map(({ tier, rating, solveCount }) => (
            <ProvisionalRatingCard
              key={tier}
              info={makeMockRatingInfo(tier, rating, solveCount)}
              peakRating={tier === "Expert" ? 1420 : rating + 50}
            />
          ))}
        </div>
      </section>

      {/* ── Provisional States ── */}
      <section className="space-y-3 rounded-xl border border-border/30 p-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Target size={14} /> Provisional & Empty States
        </h2>
        <div className="space-y-4">
          <ProvisionalRatingCard
            info={{
              rating: 0, tier: "Beginner", tierColor: "text-muted-foreground",
              tierProgress: 0, isProvisional: false, hasNoData: true,
              solveCount: 0, solvesUntilConfirmed: 5, solvesUntilLeaderboard: 10, onLeaderboard: false,
            }}
          />
          <ProvisionalRatingCard
            info={{
              rating: 620, tier: "Casual", tierColor: "text-sky-500",
              tierProgress: 73, isProvisional: true, hasNoData: false,
              solveCount: 3, solvesUntilConfirmed: 2, solvesUntilLeaderboard: 7, onLeaderboard: false,
            }}
          />
        </div>
      </section>

      {/* ── Tier-Up Celebration ── */}
      <section className="space-y-3 rounded-xl border border-border/30 p-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Sparkles size={14} /> Tier-Up Celebration
        </h2>
        <p className="text-xs text-muted-foreground">
          Animated overlay shown when a player reaches a new skill tier after a solve.
        </p>
        <div className="flex flex-wrap gap-2">
          {TIER_UP_SAMPLES.map(({ from, to, rating }) => (
            <Button
              key={to}
              size="sm"
              variant="outline"
              className="text-xs h-8"
              onClick={() => setCelebrationTier({ from, to, rating })}
            >
              <span className={cn("inline-block w-2 h-2 rounded-full mr-1.5", getTierBadgeStyle(to).split(" ")[0])} />
              {from} → {to}
            </Button>
          ))}
        </div>
      </section>

      {/* Celebration overlay */}
      {celebrationTier && (
        <TierUpCelebration
          fromTier={celebrationTier.from}
          toTier={celebrationTier.to}
          rating={celebrationTier.rating}
          onDismiss={() => setCelebrationTier(null)}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function MockCraftAnalytics({ title, totalSent, totalStarted, totalCompleted, avgTime, fastestTime, creatorTime, solvers }: {
  title: string; totalSent: number; totalStarted: number; totalCompleted: number;
  avgTime: number | null; fastestTime: number | null; creatorTime: number | null;
  solvers: { name: string; time: number }[];
}) {
  const completionRate = totalSent > 0 ? totalCompleted / totalSent : 0;
  const stats = [
    { icon: Users, label: "Recipients", value: totalSent, sub: `${totalStarted} started` },
    { icon: Trophy, label: "Completed", value: `${Math.round(completionRate * 100)}%`, sub: `${totalCompleted} of ${totalSent}`, highlight: completionRate > 0.7 },
    { icon: Clock, label: "Avg time", value: avgTime ? fmtTime(avgTime) : "—", sub: creatorTime ? `You: ${fmtTime(creatorTime)}` : "No solves yet" },
    { icon: Target, label: "Fastest", value: fastestTime ? fmtTime(fastestTime) : "—", sub: fastestTime && creatorTime ? (fastestTime < creatorTime ? "Beat your time 🏆" : "Yours is fastest") : "", highlight: !!(fastestTime && creatorTime && fastestTime < creatorTime) },
  ];

  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
        <Star size={14} className="text-primary" />
        <p className="text-sm font-semibold text-foreground">"{title}" analytics</p>
      </div>
      <div className="grid grid-cols-2 gap-px bg-border/30">
        {stats.map(({ icon: Icon, label, value, sub, highlight }) => (
          <div key={label} className={cn("flex flex-col gap-0.5 bg-card p-3.5", highlight && "bg-emerald-50/50 dark:bg-emerald-950/20")}>
            <div className="flex items-center gap-1.5">
              <Icon size={12} className={highlight ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"} />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
            </div>
            <p className={cn("text-lg font-bold leading-none font-mono", highlight ? "text-emerald-700 dark:text-emerald-300" : "text-foreground")}>{value}</p>
            {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>
      {solvers.length > 0 ? (
        <div className="border-t border-border/40">
          <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Solvers</p>
          {solvers.map((s, i) => (
            <div key={i} className={cn("flex items-center gap-3 px-4 py-2.5", i < solvers.length - 1 && "border-b border-border/30")}>
              <span className="text-sm w-4 text-center text-muted-foreground/60 font-bold">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</span>
              <span className="flex-1 text-sm text-foreground truncate">{s.name}</span>
              <span className="font-mono text-sm font-medium text-foreground">{fmtTime(s.time)}</span>
              {creatorTime && s.time < creatorTime && <span className="text-[10px] text-emerald-600 font-medium">beat you</span>}
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 py-5 text-center">
          <p className="text-sm text-muted-foreground">No solves yet</p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">Share the puzzle link to get solvers on the board</p>
        </div>
      )}
    </div>
  );
}

// ── Daily Confetti preview (mirrors DailyPuzzle confetti) ──────────────────

const DAILY_CONFETTI_COLORS_PREVIEW = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "#fbbf24", "#f97316", "#ef4444", "#8b5cf6", "#06b6d4",
];

function DailyConfettiPreview() {
  const [particles] = useState(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.6,
      duration: 1.2 + Math.random() * 1.0,
      size: 4 + Math.random() * 6,
      color: DAILY_CONFETTI_COLORS_PREVIEW[Math.floor(Math.random() * DAILY_CONFETTI_COLORS_PREVIEW.length)],
      rotation: Math.random() * 360,
      drift: (Math.random() - 0.5) * 60,
    }))
  );

  return (
    <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-xl" aria-hidden>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-[dailyConfettiFall_var(--dur)_ease-out_var(--delay)_forwards]"
          style={{
            left: `${p.x}%`,
            top: "-10px",
            width: p.size,
            height: p.size * 1.4,
            backgroundColor: p.color,
            borderRadius: "2px",
            transform: `rotate(${p.rotation}deg)`,
            opacity: 0,
            "--delay": `${p.delay}s`,
            "--dur": `${p.duration}s`,
            "--drift": `${p.drift}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ── Share Card Live Previews ──────────────────────────────────────────────

const SHARE_CARD_SAMPLES = [
  { label: "Daily Solve", puzzleType: "crossword" as const, difficulty: "medium" as const, time: 272, isNewBest: false, streakDays: 7, isDaily: true },
  { label: "New Personal Best", puzzleType: "sudoku" as const, difficulty: "hard" as const, time: 485, isNewBest: true, streakDays: 14, isDaily: false },
  { label: "Quick Solve (no streak)", puzzleType: "word-search" as const, difficulty: "easy" as const, time: 61, isNewBest: false, streakDays: 0, isDaily: false },
];

const MILESTONE_CARD_SAMPLES: { label: string; description: string; icon: string; rarity?: "common" | "rare" | "legendary" }[] = [
  { label: "50 Puzzles Solved", description: "Consistency is the secret. Keep that streak burning.", icon: "flame", rarity: "common" },
  { label: "7-Day Streak", description: "A full week of puzzles. You're unstoppable.", icon: "zap", rarity: "rare" },
  { label: "Expert Rank", description: "Top-tier solver. You've mastered the craft.", icon: "crown", rarity: "legendary" },
];

const CARD_PREVIEW_W = 1080;
const CARD_PREVIEW_H = 1080;
const CP_BG_TOP = "#141210";
const CP_BG_BOT = "#0c0b09";
const CP_ORANGE = "#F97316";
const CP_TEXT = "#f5f0e8";
const CP_SEC = "#a89a88";
const CP_DIM = "#6b5f52";
const CP_FONT = "-apple-system, 'SF Pro Display', 'Inter', system-ui, sans-serif";
const CP_MONO = "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace";

function cpRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

function renderSolvePreview(canvas: HTMLCanvasElement, sample: typeof SHARE_CARD_SAMPLES[0]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = CARD_PREVIEW_W, H = CARD_PREVIEW_H;
  canvas.width = W; canvas.height = H;

  const typeNames: Record<string, string> = { crossword: "Crossword", sudoku: "Sudoku", "word-search": "Word Search", cryptogram: "Cryptogram", "word-fill": "Word Fill-In", kakuro: "Kakuro", nonogram: "Nonogram", "number-fill": "Number Fill-In" };
  const diffLabels: Record<string, string> = { easy: "Easy", medium: "Medium", hard: "Hard", extreme: "Extreme", insane: "Insane" };
  const typeName = typeNames[sample.puzzleType] ?? sample.puzzleType;
  const diffLabel = diffLabels[sample.difficulty] ?? sample.difficulty;
  const mins = Math.floor(sample.time / 60);
  const secs = sample.time % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, "0")}`;

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, CP_BG_TOP); bg.addColorStop(1, CP_BG_BOT);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W/2, H*0.42, 0, W/2, H*0.42, 420);
  glow.addColorStop(0, "rgba(249,115,22,0.06)"); glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

  const tg = ctx.createLinearGradient(W*0.2, 0, W*0.8, 0);
  tg.addColorStop(0, "transparent"); tg.addColorStop(0.5, CP_ORANGE); tg.addColorStop(1, "transparent");
  ctx.fillStyle = tg; ctx.fillRect(0, 0, W, 3);

  ctx.textAlign = "center";
  ctx.font = `600 24px ${CP_FONT}`; ctx.fillStyle = CP_DIM;
  ctx.fillText("PUZZLECRAFT", W/2, 80);

  const pill = sample.isDaily ? `DAILY  ·  ${typeName.toUpperCase()}  ·  ${diffLabel.toUpperCase()}` : `${typeName.toUpperCase()}  ·  ${diffLabel.toUpperCase()}`;
  ctx.font = `600 18px ${CP_FONT}`;
  const pw = ctx.measureText(pill).width + 48;
  ctx.fillStyle = "rgba(249,115,22,0.12)";
  cpRoundedRect(ctx, (W-pw)/2, 110, pw, 40, 20); ctx.fill();
  ctx.fillStyle = CP_ORANGE; ctx.fillText(pill, W/2, 136);

  if (sample.isNewBest) { ctx.font = `700 20px ${CP_FONT}`; ctx.fillStyle = "#ffb347"; ctx.fillText("🏆  NEW PERSONAL BEST", W/2, 210); }

  const heroY = sample.isNewBest ? 400 : 380;
  ctx.font = `700 180px ${CP_MONO}`; ctx.fillStyle = CP_TEXT; ctx.fillText(timeStr, W/2, heroY);
  ctx.font = `500 22px ${CP_FONT}`; ctx.fillStyle = CP_DIM; ctx.fillText("SOLVE TIME", W/2, heroY + 50);

  if (sample.streakDays > 0) {
    const sy = heroY + 100;
    ctx.fillStyle = "rgba(249,115,22,0.12)";
    cpRoundedRect(ctx, (W-260)/2, sy, 260, 80, 16); ctx.fill();
    ctx.font = `700 36px ${CP_FONT}`; ctx.fillStyle = CP_ORANGE; ctx.fillText(`🔥 ${sample.streakDays}`, W/2, sy+38);
    ctx.font = `500 16px ${CP_FONT}`; ctx.fillStyle = CP_SEC; ctx.fillText("DAY STREAK", W/2, sy+64);
  }

  const dg = ctx.createLinearGradient(W*0.25, 0, W*0.75, 0);
  dg.addColorStop(0, "transparent"); dg.addColorStop(0.5, "rgba(249,115,22,0.15)"); dg.addColorStop(1, "transparent");
  ctx.fillStyle = dg; ctx.fillRect(W*0.15, H-160, W*0.7, 1);

  ctx.font = `500 22px ${CP_FONT}`; ctx.fillStyle = CP_SEC; ctx.fillText("Can you beat this?", W/2, H-100);
  ctx.font = `400 18px ${CP_FONT}`; ctx.fillStyle = CP_DIM; ctx.fillText("puzzlecrft.com", W/2, H-65);

  const bg2 = ctx.createLinearGradient(W*0.2, 0, W*0.8, 0);
  bg2.addColorStop(0, "transparent"); bg2.addColorStop(0.5, "rgba(249,115,22,0.4)"); bg2.addColorStop(1, "transparent");
  ctx.fillStyle = bg2; ctx.fillRect(0, H-3, W, 3);
}

function renderMilestonePreview(canvas: HTMLCanvasElement, m: typeof MILESTONE_CARD_SAMPLES[0], streakDays: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = CARD_PREVIEW_W, H = CARD_PREVIEW_H;
  canvas.width = W; canvas.height = H;

  const accent = m.rarity === "legendary" ? "#c084fc" : m.rarity === "rare" ? "#fb923c" : CP_ORANGE;
  const emoji = MILESTONE_ICON_EMOJI[m.icon as keyof typeof MILESTONE_ICON_EMOJI] ?? "🏆";
  const rarityText = m.rarity === "legendary" ? "LEGENDARY" : m.rarity === "rare" ? "RARE" : "ACHIEVEMENT";

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, CP_BG_TOP); bg.addColorStop(1, CP_BG_BOT);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W/2, H*0.38, 0, W/2, H*0.38, 380);
  glow.addColorStop(0, accent + "0D"); glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

  const tg = ctx.createLinearGradient(W*0.2, 0, W*0.8, 0);
  tg.addColorStop(0, "transparent"); tg.addColorStop(0.5, accent); tg.addColorStop(1, "transparent");
  ctx.fillStyle = tg; ctx.fillRect(0, 0, W, 3);

  ctx.textAlign = "center";
  ctx.font = `600 24px ${CP_FONT}`; ctx.fillStyle = CP_DIM; ctx.fillText("PUZZLECRAFT", W/2, 80);

  ctx.font = `700 18px ${CP_FONT}`;
  const pw = ctx.measureText(rarityText).width + 48;
  ctx.fillStyle = accent + "1A";
  cpRoundedRect(ctx, (W-pw)/2, 110, pw, 38, 19); ctx.fill();
  ctx.fillStyle = accent; ctx.fillText(rarityText, W/2, 135);

  ctx.font = "180px serif"; ctx.fillStyle = CP_TEXT; ctx.fillText(emoji, W/2, 370);
  ctx.font = `700 64px ${CP_FONT}`; ctx.fillStyle = CP_TEXT; ctx.fillText(m.label, W/2, 490);
  ctx.font = `400 26px ${CP_FONT}`; ctx.fillStyle = CP_SEC; ctx.fillText(m.description, W/2, 550);

  if (streakDays > 0) {
    ctx.fillStyle = "rgba(249,115,22,0.12)";
    cpRoundedRect(ctx, (W-240)/2, 700, 240, 76, 16); ctx.fill();
    ctx.font = `700 34px ${CP_FONT}`; ctx.fillStyle = CP_ORANGE; ctx.fillText(`🔥 ${streakDays}`, W/2, 736);
    ctx.font = `500 16px ${CP_FONT}`; ctx.fillStyle = CP_SEC; ctx.fillText("DAY STREAK", W/2, 762);
  }

  const dg = ctx.createLinearGradient(W*0.25, 0, W*0.75, 0);
  dg.addColorStop(0, "transparent"); dg.addColorStop(0.5, accent + "30"); dg.addColorStop(1, "transparent");
  ctx.fillStyle = dg; ctx.fillRect(W*0.15, H-140, W*0.7, 1);

  ctx.font = `400 20px ${CP_FONT}`; ctx.fillStyle = CP_DIM; ctx.fillText("puzzlecrft.com", W/2, H-60);

  const bg2 = ctx.createLinearGradient(W*0.2, 0, W*0.8, 0);
  bg2.addColorStop(0, "transparent"); bg2.addColorStop(0.5, accent + "66"); bg2.addColorStop(1, "transparent");
  ctx.fillStyle = bg2; ctx.fillRect(0, H-3, W, 3);
}

function ShareCardCanvas({ render, label }: { render: (canvas: HTMLCanvasElement) => void; label?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [enlarged, setEnlarged] = useState(false);
  useEffect(() => {
    if (canvasRef.current) render(canvasRef.current);
  }, [render]);
  return (
    <>
      <canvas
        ref={canvasRef}
        onClick={() => setEnlarged(true)}
        className="w-full max-w-[280px] rounded-xl border border-border/20 shadow-lg cursor-zoom-in hover:shadow-xl transition-shadow"
        style={{ aspectRatio: "1/1" }}
      />
      {enlarged && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setEnlarged(false)}
        >
          <div className="relative max-w-[min(90vw,540px)] max-h-[90vh] animate-in zoom-in-90 duration-200">
            <canvas
              ref={(el) => { if (el) render(el); }}
              className="w-full rounded-2xl shadow-2xl"
              style={{ aspectRatio: "1/1" }}
            />
            {label && (
              <p className="text-center text-sm text-white/70 mt-3">{label}</p>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setEnlarged(false); }}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center shadow-lg hover:bg-muted transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function ShareCardPreviews() {
  return (
    <div className="space-y-8">
      <section className="space-y-3 rounded-xl border border-border/30 p-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Clock size={14} /> Solve Share Cards
        </h2>
        <p className="text-xs text-muted-foreground">
          Generated as 1080×1080 PNGs — shared via iOS share sheet or downloaded.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {SHARE_CARD_SAMPLES.map((sample) => (
            <div key={sample.label} className="space-y-2">
              <ShareCardCanvas render={(c) => renderSolvePreview(c, sample)} label={`${sample.label} — ${sample.puzzleType} · ${sample.difficulty}`} />
              <p className="text-xs font-medium text-foreground">{sample.label}</p>
              <p className="text-[10px] text-muted-foreground">{sample.puzzleType} · {sample.difficulty} · {Math.floor(sample.time/60)}:{(sample.time%60).toString().padStart(2,"0")}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-border/30 p-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Trophy size={14} /> Milestone Share Cards
        </h2>
        <p className="text-xs text-muted-foreground">
          Achievement cards with rarity-based accent colors — common (orange), rare (amber), legendary (purple).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {MILESTONE_CARD_SAMPLES.map((m) => (
            <div key={m.label} className="space-y-2">
              <ShareCardCanvas render={(c) => renderMilestonePreview(c, m, 7)} label={`${m.label} — ${m.rarity ?? "common"} rarity`} />
              <p className="text-xs font-medium text-foreground">{m.label}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{m.rarity ?? "common"} rarity</p>
            </div>
          ))}
        </div>
      </section>

      <ShareMessagePreviews />
    </div>
  );
}
// ── Weekly Packs Preview ──────────────────────────────────────────────────────

const PACK_THEMES_ROTATION = [
  { theme: "Around the World",    emoji: "🌍", description: "Geography, languages, and landmarks from every continent" },
  { theme: "Silver Screen",       emoji: "🎬", description: "Classic cinema, directors, and unforgettable movie moments" },
  { theme: "The Natural World",   emoji: "🌿", description: "Animals, ecosystems, and the wonders of nature" },
  { theme: "Into the Kitchen",    emoji: "🍳", description: "Ingredients, techniques, and cuisines from around the globe" },
  { theme: "Great Minds",         emoji: "🧠", description: "Scientists, inventors, and the ideas that changed everything" },
  { theme: "Game On",             emoji: "🎮", description: "Video games, board games, and the culture of play" },
  { theme: "Music to My Ears",    emoji: "🎵", description: "Genres, legends, and the language of music" },
  { theme: "By the Book",         emoji: "📚", description: "Literature, authors, and stories that endure" },
  { theme: "Sports Legends",      emoji: "🏆", description: "Athletes, records, and the greatest moments in sport" },
  { theme: "Into Space",          emoji: "🚀", description: "Planets, missions, and the infinite universe" },
  { theme: "Ancient History",     emoji: "🏛️", description: "Civilizations, empires, and the echoes of the past" },
  { theme: "Pop Culture Remix",   emoji: "✨", description: "Trends, moments, and the things everyone's talking about" },
];

const PUZZLE_TITLES_MAP: Record<string, string[]> = {
  "Around the World":   ["Capital Cities", "Famous Landmarks", "World Cuisines", "Languages of Earth", "Mountain Ranges"],
  "Silver Screen":      ["Best Picture Winners", "Iconic Directors", "Legendary Actors", "Film Genres", "Classic Quotes"],
  "The Natural World":  ["Endangered Species", "Ocean Deep", "The Rainforest", "Bird Life", "Geology"],
  "Into the Kitchen":   ["Classic French Techniques", "Spices of the World", "Knife Skills", "Baking Science", "Street Food"],
  "Great Minds":        ["Nobel Laureates", "Famous Inventions", "Scientific Theory", "Math Pioneers", "Space Explorers"],
  "Game On":            ["Console Generations", "Classic Board Games", "Esports Champions", "Game Mechanics", "Pixel Art Icons"],
  "Music to My Ears":   ["Genre Origins", "Record Breakers", "Legendary Bands", "Music Theory", "Concert Moments"],
  "By the Book":        ["Booker Prize Winners", "Classic Authors", "Literary Devices", "Famous Characters", "Opening Lines"],
  "Sports Legends":     ["Olympic Records", "World Cup Moments", "Tennis Greats", "Boxing Champions", "Racing Icons"],
  "Into Space":         ["Solar System", "Space Missions", "Astronomers", "Black Holes", "The Cosmos"],
  "Ancient History":    ["Roman Empire", "Ancient Egypt", "Greek Mythology", "The Silk Road", "Lost Civilizations"],
  "Pop Culture Remix":  ["Viral Moments", "Iconic Fashion", "Internet Culture", "Award Shows", "Decade Defining"],
};

function getISOWeekAdmin(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return {
    week: Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7),
    year: d.getUTCFullYear(),
  };
}

function getSundayOfWeekAdmin(week: number, year: number): Date {
  const jan1 = new Date(year, 0, 1);
  const daysToFirstSunday = (7 - jan1.getDay()) % 7;
  const firstSunday = new Date(year, 0, 1 + daysToFirstSunday);
  return new Date(firstSunday.getTime() + (week - 1) * 7 * 86400000);
}

interface FuturePackInfo {
  id: string;
  weekNumber: number;
  year: number;
  theme: string;
  emoji: string;
  description: string;
  puzzleTitles: string[];
  puzzleTypes: string[];
  puzzleDifficulties: string[];
  puzzleSeeds: string[];
  releaseDate: Date;
  isOverride: boolean;
  overrideFrom?: string;
  overrideTo?: string;
  isCurrent: boolean;
}

/** Convert a string seed to a numeric seed for generators */
function hashStringSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) || 1;
}

function generateFuturePacks(weeksAhead: number): FuturePackInfo[] {
  const now = new Date();
  const packs: FuturePackInfo[] = [];

  for (let offset = 0; offset < weeksAhead; offset++) {
    const targetDate = new Date(now.getTime() + offset * 7 * 86400000);
    const { week, year } = getISOWeekAdmin(targetDate);
    const releaseDate = getSundayOfWeekAdmin(week, year);
    const packId = `pack-${year}-${week}`;

    // Check if already added (same week)
    if (packs.some(p => p.id === packId || p.id === `override-${packId}`)) continue;

    // Check for override
    const dateStr = releaseDate.toISOString().slice(0, 10);
    const override = SCHEDULED_OVERRIDES.find(o => dateStr >= o.from && dateStr <= o.to);

    if (override) {
      // Check if this override is already added
      const overrideId = `override-${override.from}`;
      if (packs.some(p => p.id === overrideId)) continue;

      const overrideDiffs = override.puzzles.map(p => p.difficulty);
      const overrideSeeds = override.puzzles.map((p, i) => `override-${override.from}-${i}`);
      packs.push({
        id: overrideId,
        weekNumber: week,
        year,
        theme: override.theme,
        emoji: override.emoji,
        description: override.description,
        puzzleTitles: override.puzzles.map(p => p.title),
        puzzleTypes: override.puzzles.map(p => p.type),
        puzzleDifficulties: overrideDiffs,
        puzzleSeeds: overrideSeeds,
        releaseDate,
        isOverride: true,
        overrideFrom: override.from,
        overrideTo: override.to,
        isCurrent: offset === 0,
      });
    } else {
      const themeIndex = (week + year * 52) % PACK_THEMES_ROTATION.length;
      const t = PACK_THEMES_ROTATION[themeIndex];
      const titles = PUZZLE_TITLES_MAP[t.theme] ?? ["Puzzle 1", "Puzzle 2", "Puzzle 3", "Puzzle 4", "Puzzle 5"];
      const types = ["crossword", "word-search", "sudoku", "cryptogram", "word-fill"];

      const defaultDiffs = ["easy", "medium", "medium", "hard", "hard"];
      const defaultSeeds = types.map((_, i) => `pack-${year}-${week}-${i}`);

      packs.push({
        id: packId,
        weekNumber: week,
        year,
        theme: t.theme,
        emoji: t.emoji,
        description: t.description,
        puzzleTitles: titles,
        puzzleTypes: types,
        puzzleDifficulties: defaultDiffs,
        puzzleSeeds: defaultSeeds,
        releaseDate,
        isOverride: false,
        isCurrent: offset === 0,
      });
    }
  }

  return packs;
}

const TYPE_EMOJI: Record<string, string> = {
  crossword: "📝",
  "word-search": "🔍",
  sudoku: "🔢",
  cryptogram: "🔐",
  "word-fill": "✏️",
};

// ── Mini Puzzle Preview ─────────────────────────────────────────────────────
function MiniPuzzlePreview({ type, seed, difficulty }: { type: string; seed: string; difficulty: string }) {
  const numSeed = hashStringSeed(seed);
  const diff = (difficulty || "medium") as Difficulty;

  return useMemo(() => {
    try {
      switch (type) {
        case "crossword": {
          const gen = generateCrossword(numSeed, diff);
          const blacks = new Set(gen.blackCells.map(([r, c]) => `${r}-${c}`));
          const cellSize = Math.max(3, Math.min(6, Math.floor(96 / gen.gridSize)));
          return (
            <div className="inline-grid border border-border/40 rounded overflow-hidden" style={{ gridTemplateColumns: `repeat(${gen.gridSize}, ${cellSize}px)` }}>
              {Array.from({ length: gen.gridSize * gen.gridSize }, (_, idx) => {
                const r = Math.floor(idx / gen.gridSize);
                const c = idx % gen.gridSize;
                const isBlack = blacks.has(`${r}-${c}`);
                return <div key={idx} style={{ width: cellSize, height: cellSize }} className={isBlack ? "bg-foreground" : "bg-background"} />;
              })}
            </div>
          );
        }
        case "sudoku": {
          const gen = generateSudoku(numSeed, diff);
          return (
            <div className="inline-grid border border-border/40 rounded overflow-hidden" style={{ gridTemplateColumns: "repeat(9, 8px)" }}>
              {gen.grid.flat().map((v, i) => (
                <div key={i} className={cn("w-2 h-2 text-center", v ? "bg-muted" : "bg-background")}
                  style={{ borderRight: (i % 9) % 3 === 2 && (i % 9) !== 8 ? "1px solid hsl(var(--border))" : undefined,
                           borderBottom: Math.floor(i / 9) % 3 === 2 && Math.floor(i / 9) !== 8 ? "1px solid hsl(var(--border))" : undefined }} />
              ))}
            </div>
          );
        }
        case "word-search": {
          const words = WORD_CLUES.slice(0, 10).map(w => w[0]);
          const gen = generateWordSearch(numSeed, diff, words);
          const cellSize = Math.max(3, Math.min(5, Math.floor(80 / gen.size)));
          return (
            <div className="inline-grid border border-border/40 rounded overflow-hidden" style={{ gridTemplateColumns: `repeat(${gen.size}, ${cellSize}px)` }}>
              {gen.grid.flat().map((ch, i) => (
                <div key={i} style={{ width: cellSize, height: cellSize, fontSize: Math.max(4, cellSize - 1) }}
                  className="bg-background text-foreground/30 flex items-center justify-center leading-none font-mono">
                  {ch}
                </div>
              ))}
            </div>
          );
        }
        case "cryptogram": {
          const gen = generateCryptogram(numSeed, diff);
          const preview = gen.encoded.slice(0, 40);
          return (
            <div className="font-mono text-[8px] leading-tight text-muted-foreground bg-background border border-border/40 rounded px-2 py-1.5 max-w-[120px] overflow-hidden">
              {preview}…
            </div>
          );
        }
        case "word-fill": {
          const gen = generateWordFillIn(numSeed, diff);
          const blacks = new Set(gen.blackCells.map(([r, c]) => `${r}-${c}`));
          const cellSize = Math.max(3, Math.min(6, Math.floor(96 / gen.gridSize)));
          return (
            <div className="inline-grid border border-border/40 rounded overflow-hidden" style={{ gridTemplateColumns: `repeat(${gen.gridSize}, ${cellSize}px)` }}>
              {Array.from({ length: gen.gridSize * gen.gridSize }, (_, idx) => {
                const r = Math.floor(idx / gen.gridSize);
                const c = idx % gen.gridSize;
                const isBlack = blacks.has(`${r}-${c}`);
                return <div key={idx} style={{ width: cellSize, height: cellSize }} className={isBlack ? "bg-foreground" : "bg-background"} />;
              })}
            </div>
          );
        }
        default:
          return <div className="w-16 h-16 bg-secondary/30 rounded flex items-center justify-center text-2xl">🧩</div>;
      }
    } catch {
      return <div className="w-16 h-16 bg-destructive/10 rounded flex items-center justify-center text-[10px] text-destructive">Error</div>;
    }
  }, [type, numSeed, diff]);
}

function WeeklyPacksPreview() {
  const futurePacks = useMemo(() => generateFuturePacks(52), []);
  const overridesPacks = useMemo(() => {
    return [...SCHEDULED_OVERRIDES]
      .sort((a, b) => a.from.localeCompare(b.from))
      .map((o) => ({ ...o, isPast: new Date(o.to) < new Date() }));
  }, []);

  // ── DB custom packs ──
  const [dbPacks, setDbPacks] = useState<any[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);
  const [expandedPackId, setExpandedPackId] = useState<string | null>(null);
  const [expandedScheduleId, setExpandedScheduleId] = useState<string | null>(null);

  // ── Create form state ──
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTheme, setFormTheme] = useState("");
  const [formEmoji, setFormEmoji] = useState("🧩");
  const [formDesc, setFormDesc] = useState("");
  const [formFrom, setFormFrom] = useState("");
  const [formTo, setFormTo] = useState("");
  const [formPuzzles, setFormPuzzles] = useState<{ title: string; type: string; difficulty: string }[]>([
    { title: "", type: "crossword", difficulty: "easy" },
    { title: "", type: "word-search", difficulty: "easy" },
    { title: "", type: "sudoku", difficulty: "medium" },
    { title: "", type: "cryptogram", difficulty: "medium" },
    { title: "", type: "word-fill", difficulty: "hard" },
  ]);
  const [saving, setSaving] = useState(false);

  const fetchDbPacks = useCallback(async () => {
    setLoadingDb(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from("custom_weekly_packs")
        .select("*")
        .order("from_date", { ascending: true });
      setDbPacks(data ?? []);
    } catch {}
    setLoadingDb(false);
  }, []);

  useEffect(() => { fetchDbPacks(); }, [fetchDbPacks]);

  const resetForm = () => {
    setFormTheme(""); setFormEmoji("🧩"); setFormDesc(""); setFormFrom(""); setFormTo("");
    setFormPuzzles([
      { title: "", type: "crossword", difficulty: "easy" },
      { title: "", type: "word-search", difficulty: "easy" },
      { title: "", type: "sudoku", difficulty: "medium" },
      { title: "", type: "cryptogram", difficulty: "medium" },
      { title: "", type: "word-fill", difficulty: "hard" },
    ]);
    setEditingId(null);
  };

  const handleEdit = (pack: any) => {
    setEditingId(pack.id);
    setFormTheme(pack.theme);
    setFormEmoji(pack.emoji);
    setFormDesc(pack.description);
    setFormFrom(pack.from_date);
    setFormTo(pack.to_date);
    const puzzles = (pack.puzzles ?? []) as { title: string; type: string; difficulty: string }[];
    while (puzzles.length < 5) puzzles.push({ title: "", type: "crossword", difficulty: "easy" });
    setFormPuzzles(puzzles.slice(0, 5));
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formTheme || !formFrom || !formTo) return;
    setSaving(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const payload = {
        theme: formTheme,
        emoji: formEmoji,
        description: formDesc,
        from_date: formFrom,
        to_date: formTo,
        puzzles: formPuzzles.filter(p => p.title.trim()),
      };
      if (editingId) {
        await supabase.from("custom_weekly_packs").update(payload).eq("id", editingId);
      } else {
        await supabase.from("custom_weekly_packs").insert(payload);
      }
      setShowForm(false);
      resetForm();
      await fetchDbPacks();
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.from("custom_weekly_packs").delete().eq("id", id);
    await fetchDbPacks();
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.from("custom_weekly_packs").update({ is_active: !current }).eq("id", id);
    await fetchDbPacks();
  };

  const updatePuzzle = (index: number, field: string, value: string) => {
    setFormPuzzles(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const PUZZLE_TYPES = ["crossword", "word-search", "sudoku", "cryptogram", "word-fill"];
  const DIFFICULTIES = ["easy", "medium", "hard"];
  const EMOJI_OPTIONS = ["🧩", "🌍", "🎬", "🌿", "🍳", "🧠", "🎮", "🎵", "📚", "🏆", "🚀", "🏛️", "✨", "🎃", "🦃", "🎄", "🎉", "❤️", "☘️", "⛳", "🥇", "🏈", "🎆", "🌸", "🌊", "🎭", "🎪", "🏖️", "🎯", "🔥"];

  return (
    <div className="space-y-8">

      {/* ── DB Custom Packs ────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">Custom Packs (Database)</h2>
            <p className="text-xs text-muted-foreground">
              {dbPacks.length} pack{dbPacks.length !== 1 ? "s" : ""} saved. These override auto-rotation when active.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => { resetForm(); setShowForm(true); }}
            className="gap-1.5"
          >
            <span className="text-lg leading-none">+</span> New Pack
          </Button>
        </div>

        {/* Create / Edit Form */}
        {showForm && (
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-4 mb-4">
            <h3 className="font-bold text-foreground text-sm">
              {editingId ? "Edit Pack" : "Create New Pack"}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {/* Theme */}
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs font-medium text-muted-foreground block mb-1">Theme / Title</label>
                <input
                  type="text"
                  value={formTheme}
                  onChange={(e) => setFormTheme(e.target.value)}
                  placeholder="e.g. Summer Vibes"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50"
                />
              </div>

              {/* Emoji picker */}
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs font-medium text-muted-foreground block mb-1">Emoji</label>
                <div className="flex flex-wrap gap-1.5">
                  {EMOJI_OPTIONS.map((e) => (
                    <button
                      key={e}
                      onClick={() => setFormEmoji(e)}
                      className={cn(
                        "w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all",
                        formEmoji === e ? "ring-2 ring-primary bg-primary/10 scale-110" : "hover:bg-secondary/50"
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground block mb-1">Description</label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Short tagline for the pack card"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50"
                />
              </div>

              {/* Date range */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Start Date</label>
                <input
                  type="date"
                  value={formFrom}
                  onChange={(e) => setFormFrom(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">End Date</label>
                <input
                  type="date"
                  value={formTo}
                  onChange={(e) => setFormTo(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
            </div>

            {/* Puzzles */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">Puzzles (up to 5) — drag to reorder</label>
              <div className="space-y-1">
                {formPuzzles.map((p, i) => (
                  <div
                    key={i}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(i)); (e.currentTarget as HTMLElement).style.opacity = "0.5"; }}
                    onDragEnd={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const from = parseInt(e.dataTransfer.getData("text/plain"), 10);
                      if (isNaN(from) || from === i) return;
                      setFormPuzzles(prev => {
                        const next = [...prev];
                        const [moved] = next.splice(from, 1);
                        next.splice(i, 0, moved);
                        return next;
                      });
                    }}
                    className="flex items-center gap-2 rounded-lg bg-background border p-2 cursor-grab active:cursor-grabbing transition-opacity"
                  >
                    {/* Drag handle */}
                    <span className="text-muted-foreground/50 shrink-0 select-none" title="Drag to reorder">⠿</span>
                    <span className="text-xs text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                    {/* Move buttons */}
                    <div className="flex flex-col shrink-0 -my-1">
                      <button
                        type="button"
                        disabled={i === 0}
                        onClick={() => setFormPuzzles(prev => { const n = [...prev]; [n[i-1], n[i]] = [n[i], n[i-1]]; return n; })}
                        className="text-[10px] leading-none text-muted-foreground hover:text-foreground disabled:opacity-20 p-0.5"
                        title="Move up"
                      >▲</button>
                      <button
                        type="button"
                        disabled={i === formPuzzles.length - 1}
                        onClick={() => setFormPuzzles(prev => { const n = [...prev]; [n[i], n[i+1]] = [n[i+1], n[i]]; return n; })}
                        className="text-[10px] leading-none text-muted-foreground hover:text-foreground disabled:opacity-20 p-0.5"
                        title="Move down"
                      >▼</button>
                    </div>
                    {/* Remove button */}
                    {formPuzzles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setFormPuzzles(prev => prev.filter((_, j) => j !== i))}
                        className="text-xs text-destructive/60 hover:text-destructive shrink-0 p-0.5"
                        title="Remove puzzle"
                      >✕</button>
                    )}
                    <input
                      type="text"
                      value={p.title}
                      onChange={(e) => updatePuzzle(i, "title", e.target.value)}
                      placeholder="Puzzle title"
                      className="flex-1 min-w-0 rounded border-0 bg-transparent px-1 py-1 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
                    />
                    <select
                      value={p.type}
                      onChange={(e) => updatePuzzle(i, "type", e.target.value)}
                      className="rounded border bg-background px-1.5 py-1 text-xs text-foreground"
                    >
                      {PUZZLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select
                      value={p.difficulty}
                      onChange={(e) => updatePuzzle(i, "difficulty", e.target.value)}
                      className="rounded border bg-background px-1.5 py-1 text-xs text-foreground"
                    >
                      {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              {formPuzzles.length < 10 && (
                <button
                  type="button"
                  onClick={() => setFormPuzzles(prev => [...prev, { title: "", type: "crossword", difficulty: "easy" }])}
                  className="mt-2 text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                >
                  <span className="text-sm leading-none">+</span> Add puzzle
                </button>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setShowForm(false); resetForm(); }}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving || !formTheme || !formFrom || !formTo}>
                {saving ? "Saving..." : editingId ? "Update Pack" : "Create Pack"}
              </Button>
            </div>
          </div>
        )}

        {/* DB Pack list */}
        {loadingDb ? (
          <p className="text-xs text-muted-foreground py-4">Loading custom packs...</p>
        ) : dbPacks.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">No custom packs yet. Click "New Pack" to create one.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {dbPacks.map((pack) => {
              const isPast = new Date(pack.to_date) < new Date();
              const isExpanded = expandedPackId === pack.id;
              const puzzles = (pack.puzzles ?? []) as { title: string; type: string; difficulty: string }[];

              return (
                <div
                  key={pack.id}
                  className={cn(
                    "rounded-xl border overflow-hidden transition-all",
                    !pack.is_active ? "opacity-40" : isPast ? "opacity-60 bg-muted/30" : "bg-card"
                  )}
                >
                  {/* Header — clickable to expand */}
                  <button
                    onClick={() => setExpandedPackId(isExpanded ? null : pack.id)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-2xl">{pack.emoji}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-foreground truncate">{pack.theme}</p>
                          {!pack.is_active && (
                            <span className="text-[9px] font-bold uppercase bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">Disabled</span>
                          )}
                          {isPast && pack.is_active && (
                            <span className="text-[9px] font-bold uppercase bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Past</span>
                          )}
                          {!isPast && pack.is_active && (
                            <span className="text-[9px] font-bold uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              {new Date(pack.from_date) <= new Date() ? "Active" : "Scheduled"}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{pack.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="text-xs font-mono text-muted-foreground">{pack.from_date}</p>
                        <p className="text-xs font-mono text-muted-foreground">→ {pack.to_date}</p>
                      </div>
                      <ChevronRight
                        size={14}
                        className={cn(
                          "text-muted-foreground/60 transition-transform",
                          isExpanded && "rotate-90"
                        )}
                      />
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t px-4 pb-4 pt-3 space-y-3">
                      {/* Puzzles with mini previews */}
                      <div className="space-y-3">
                        {puzzles.map((p, i) => {
                          const pSeed = `db-${pack.id}-${i}`;
                          const numSeed = hashStringSeed(pSeed);
                          return (
                            <div key={i} className="flex items-start gap-3 rounded-lg bg-secondary/40 px-3 py-3">
                              <MiniPuzzlePreview type={p.type} seed={pSeed} difficulty={p.difficulty} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">{p.title || "Untitled"}</p>
                                <p className="text-[10px] text-muted-foreground capitalize">{p.type} · {p.difficulty}</p>
                              </div>
                              <a
                                href={`/quick-play/${p.type}?seed=${numSeed}&d=${p.difficulty}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-1.5 text-[11px] font-medium transition-colors"
                              >
                                <Play size={10} /> Play
                              </a>
                            </div>
                          );
                        })}
                        {puzzles.length === 0 && (
                          <p className="text-xs text-muted-foreground italic">No puzzles defined</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 justify-end pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(pack.id, pack.is_active)}
                          className="text-xs"
                        >
                          {pack.is_active ? "Disable" : "Enable"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(pack)} className="text-xs">
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { if (confirm("Delete this pack?")) handleDelete(pack.id); }}
                          className="text-xs text-destructive hover:text-destructive"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Code-Defined Overrides ─────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-bold text-foreground mb-1">Code-Defined Special Packs</h2>
        <p className="text-xs text-muted-foreground mb-4">
          {SCHEDULED_OVERRIDES.length} packs defined in code. These require redeployment to change.
        </p>
        <div className="grid gap-3">
          {overridesPacks.map((o) => (
            <div
              key={o.from}
              className={cn(
                "rounded-xl border p-4 space-y-2",
                o.isPast ? "opacity-50 bg-muted/30" : "bg-card"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{o.emoji}</span>
                  <div>
                    <p className="font-bold text-foreground">{o.theme}</p>
                    <p className="text-xs text-muted-foreground">{o.description}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-mono text-muted-foreground">{o.from}</p>
                  <p className="text-xs font-mono text-muted-foreground">→ {o.to}</p>
                  {o.isPast && <span className="text-[10px] text-muted-foreground italic">past</span>}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {o.puzzles.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-lg bg-secondary/60 px-2 py-1 text-[11px] text-foreground">
                    {TYPE_EMOJI[p.type] ?? "🧩"} {p.title}
                    <span className="text-muted-foreground/60 capitalize">· {p.difficulty}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 52-Week Schedule ───────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-bold text-foreground mb-1">52-Week Schedule</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Next 52 weeks of packs. Override packs are highlighted.
        </p>
        <div className="grid gap-2">
          {futurePacks.map((pack) => {
            const isScheduleExpanded = expandedScheduleId === pack.id;
            return (
              <div
                key={pack.id}
                className={cn(
                  "rounded-xl border overflow-hidden transition-all",
                  pack.isCurrent && "ring-2 ring-primary",
                  pack.isOverride ? "bg-primary/5 border-primary/20" : "bg-card"
                )}
              >
                {/* Clickable header */}
                <button
                  onClick={() => setExpandedScheduleId(isScheduleExpanded ? null : pack.id)}
                  className="w-full p-3 flex items-start gap-3 text-left"
                >
                  <span className="text-xl shrink-0 mt-0.5">{pack.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground text-sm">{pack.theme}</p>
                      {pack.isCurrent && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-1.5 py-0.5 rounded">Now</span>
                      )}
                      {pack.isOverride && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-accent text-accent-foreground px-1.5 py-0.5 rounded">Special</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{pack.description}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {pack.puzzleTitles.map((title, i) => (
                        <span key={i} className="text-[10px] bg-secondary/50 rounded px-1.5 py-0.5 text-muted-foreground">
                          {TYPE_EMOJI[pack.puzzleTypes[i]] ?? "🧩"} {title}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-2">
                    <div>
                      <p className="text-[11px] font-mono text-muted-foreground">
                        W{pack.weekNumber} '{String(pack.year).slice(2)}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60">
                        {pack.releaseDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                      {pack.isOverride && pack.overrideFrom && (
                        <p className="text-[9px] text-primary/60 mt-0.5">
                          {pack.overrideFrom} → {pack.overrideTo}
                        </p>
                      )}
                    </div>
                    <ChevronRight
                      size={14}
                      className={cn(
                        "text-muted-foreground/60 transition-transform",
                        isScheduleExpanded && "rotate-90"
                      )}
                    />
                  </div>
                </button>

                {/* Expanded puzzle previews */}
                {isScheduleExpanded && (
                  <div className="border-t px-4 pb-4 pt-3 space-y-3">
                    {pack.puzzleTitles.map((title, i) => {
                      const pSeed = pack.puzzleSeeds[i];
                      const numSeed = hashStringSeed(pSeed);
                      const pType = pack.puzzleTypes[i];
                      const pDiff = pack.puzzleDifficulties[i];
                      return (
                        <div key={i} className="flex items-start gap-3 rounded-lg bg-secondary/40 px-3 py-3">
                          <MiniPuzzlePreview type={pType} seed={pSeed} difficulty={pDiff} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{title}</p>
                            <p className="text-[10px] text-muted-foreground capitalize">{pType} · {pDiff}</p>
                          </div>
                          <a
                            href={`/quick-play/${pType}?seed=${numSeed}&d=${pDiff}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-1.5 text-[11px] font-medium transition-colors"
                          >
                            <Play size={10} /> Play
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}


export default function AdminPreview() {
  // ── Core previews state ──
  const [showCompletion, setShowCompletion] = useState(false);
  const [showMilestone, setShowMilestone] = useState(false);
  const [showPremiumStats, setShowPremiumStats] = useState(false);
  const [completionCategory, setCompletionCategory] = useState<string>("crossword");
  const [completionDifficulty, setCompletionDifficulty] = useState<string>("medium");
  const [completionTime, setCompletionTime] = useState(185);
  const [achievedIds, setAchievedIds] = useState<Set<string>>(new Set());
  const [celebratingIds, setCelebratingIds] = useState<Set<string>>(new Set());
  const [showDailyConfetti, setShowDailyConfetti] = useState(false);

  // ── Premium / modals state ──
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeNextOpen, setUpgradeNextOpen] = useState(false);
  const [upgradeNextAnnual, setUpgradeNextAnnual] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleAchieve = useCallback((id: string) => {
    setAchievedIds((prev) => new Set(prev).add(id));
    setCelebratingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setCelebratingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 1500);
  }, []);

  const handleResetTiles = useCallback(() => {
    setAchievedIds(new Set());
    setCelebratingIds(new Set());
  }, []);

  const handleAchieveAll = useCallback(() => {
    const allIds = ALL_MILESTONES.map((m) => m.id);
    setAchievedIds(new Set(allIds));
    setCelebratingIds(new Set(allIds));
    setTimeout(() => setCelebratingIds(new Set()), 1500);
  }, []);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Preview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Preview ALL UI features with mock data — onboarding, premium, iOS, notifications, and more.
          </p>
        </div>

        <Tabs defaultValue="core" className="w-full">
          <TabsList className="w-full flex overflow-x-auto gap-1 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="core" className="text-xs flex-1 min-w-0">Core UI</TabsTrigger>
            <TabsTrigger value="premium" className="text-xs flex-1 min-w-0">Premium</TabsTrigger>
            <TabsTrigger value="ios" className="text-xs flex-1 min-w-0">iOS App</TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs flex-1 min-w-0">Notifications</TabsTrigger>
            <TabsTrigger value="craft" className="text-xs flex-1 min-w-0">Craft</TabsTrigger>
            <TabsTrigger value="patterns" className="text-xs flex-1 min-w-0">Patterns</TabsTrigger>
            <TabsTrigger value="sharecards" className="text-xs flex-1 min-w-0">Share Cards</TabsTrigger>
            <TabsTrigger value="weeklypacks" className="text-xs flex-1 min-w-0">Weekly Packs</TabsTrigger>
            <TabsTrigger value="ranking" className="text-xs flex-1 min-w-0">Ranking</TabsTrigger>
          </TabsList>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* TAB 1: CORE UI                                                */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <TabsContent value="core" className="space-y-6 mt-4">

            {/* ── Onboarding Flow ── */}
            <section className="space-y-3 rounded-xl border border-border/30 p-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Eye size={14} /> Welcome / Onboarding Screens
              </h2>
              <p className="text-xs text-muted-foreground">
                The 3-screen first-launch walkthrough — preview it without clearing localStorage.
              </p>
              <Button size="sm" onClick={() => setShowOnboarding(true)}>
                Show Onboarding Flow
              </Button>
            </section>

            {/* ── Completion Panel ── */}
            <section className="space-y-3 rounded-xl border border-border/30 p-4">
              <h2 className="text-sm font-semibold text-foreground">Completion Panel</h2>
              <div className="flex flex-wrap gap-2 items-end">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Category</label>
                  <select
                    value={completionCategory}
                    onChange={(e) => setCompletionCategory(e.target.value)}
                    className="text-xs rounded-md border border-border bg-background px-2 py-1.5"
                  >
                    {["crossword", "word-fill", "number-fill", "sudoku", "kakuro", "word-search", "cryptogram", "nonogram"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Difficulty</label>
                  <select
                    value={completionDifficulty}
                    onChange={(e) => setCompletionDifficulty(e.target.value)}
                    className="text-xs rounded-md border border-border bg-background px-2 py-1.5"
                  >
                    {["easy", "medium", "hard", "extreme", "insane"].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Time (sec)</label>
                  <input
                    type="number"
                    value={completionTime}
                    onChange={(e) => setCompletionTime(Number(e.target.value))}
                    className="text-xs rounded-md border border-border bg-background px-2 py-1.5 w-20"
                  />
                </div>
                <Button size="sm" onClick={() => setShowCompletion(!showCompletion)}>
                  {showCompletion ? "Hide" : "Show"}
                </Button>
              </div>
              {showCompletion && (
                <div className="mt-3 rounded-lg border border-border/20 p-3 bg-secondary/5">
                  <CompletionPanel
                    time={completionTime}
                    difficulty={completionDifficulty as any}
                    category={completionCategory as any}
                    onPlayAgain={() => setShowCompletion(false)}
                    accuracy={92}
                    assisted={false}
                    hintsUsed={1}
                    mistakesCount={3}
                    seed={42}
                  />
                </div>
              )}
            </section>

            {/* ── Daily Challenge Confetti ── */}
            <section className="space-y-3 rounded-xl border border-border/30 p-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles size={14} /> Daily Challenge Completion Confetti
              </h2>
              <p className="text-xs text-muted-foreground">
                Confetti burst + animated trophy banner that plays when a user solves the daily puzzle.
              </p>
              <Button
                size="sm"
                onClick={() => {
                  setShowDailyConfetti(false);
                  requestAnimationFrame(() => setShowDailyConfetti(true));
                }}
              >
                Fire Confetti
              </Button>
              <div className="relative mt-3 rounded-xl border border-border/20 p-4 bg-secondary/5 overflow-hidden min-h-[120px]">
                {showDailyConfetti && <DailyConfettiPreview />}
                <div className={cn(
                  "flex items-center gap-3",
                  showDailyConfetti && "animate-scale-in"
                )}>
                  <div className={cn(
                    "h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0",
                    showDailyConfetti && "animate-[dailyTrophyPulse_0.6s_ease-out]"
                  )}>
                    <Trophy size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-foreground">Challenge Complete!</p>
                    <p className="text-sm text-muted-foreground">
                      You solved today's Crossword in 3:05. Come back tomorrow for a new challenge.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* ── Milestone Tiles ── */}
            <section className="space-y-3 rounded-xl border border-border/30 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Milestone Tiles</h2>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-xs" onClick={handleAchieveAll}>
                    Achieve All
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs" onClick={handleResetTiles}>
                    Reset
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Click a tile to trigger the achievement confetti animation.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ALL_MILESTONES.map((m) => {
                  const IconComp = ICON_MAP[m.icon] ?? Target;
                  const isAchieved = achievedIds.has(m.id);
                  const isCelebrating = celebratingIds.has(m.id);
                  const mockProgress = isAchieved ? 100 : Math.floor(Math.random() * 60 + 20);

                  return (
                    <button
                      key={m.id}
                      onClick={() => !isAchieved && handleAchieve(m.id)}
                      className={cn(
                        "rounded-lg border p-3 transition-all relative text-left",
                        isAchieved && "bg-primary/5 border-primary/25",
                        !isAchieved && "bg-card border-border hover:border-primary/20 hover:bg-primary/[0.02]",
                        isCelebrating && "ring-2 ring-primary/30",
                      )}
                    >
                      {isCelebrating && <ConfettiParticles />}
                      {isCelebrating && (
                        <>
                          <span className="absolute top-1 right-1 text-primary animate-pulse text-xs">✦</span>
                          <span className="absolute bottom-1 left-2 text-primary/60 animate-pulse text-[10px]" style={{ animationDelay: "0.2s" }}>✦</span>
                        </>
                      )}
                      <div className="flex items-start gap-2.5">
                        <IconComp
                          size={18}
                          className={cn(
                            "shrink-0 mt-0.5 transition-colors",
                            isAchieved ? "text-primary" : "text-muted-foreground",
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-xs leading-tight",
                            isAchieved ? "text-foreground font-medium" : "text-muted-foreground"
                          )}>{m.label}</p>
                          {!isAchieved && (
                            <div className="mt-1.5 space-y-1">
                              <Progress value={mockProgress} className="h-1.5" />
                              <p className="text-[10px] text-muted-foreground">{mockProgress}%</p>
                            </div>
                          )}
                          {isAchieved && (
                            <p className="text-[10px] text-primary/70 mt-0.5">Achieved ✓</p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ── Milestone Modal ── */}
            <section className="space-y-3 rounded-xl border border-border/30 p-4">
              <h2 className="text-sm font-semibold text-foreground">Milestone Celebration Modal</h2>
              <p className="text-xs text-muted-foreground">
                Opens as a full-screen overlay with confetti and haptic feedback.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setShowMilestone(true)}>
                  Show All 3 Milestones
                </Button>
                {ICON_OPTIONS.map((icon) => (
                  <Button
                    key={icon}
                    size="sm"
                    variant="outline"
                    onClick={() => setShowMilestone(true)}
                    className="text-xs capitalize"
                  >
                    {icon}
                  </Button>
                ))}
              </div>
            </section>

            {showMilestone && (
              <MilestoneModal
                milestones={MOCK_MILESTONES}
                onDismiss={() => setShowMilestone(false)}
              />
            )}

            {/* ── Share Messages ── */}
            <ShareMessagePreviews />

            {/* ── Craft Leaderboard ── */}
            <LeaderboardPreview />

            {/* ── Craft Theme Picker ── */}
            <section className="space-y-3 rounded-xl border border-border/30 p-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles size={14} /> Craft Theme Picker
              </h2>
              <p className="text-xs text-muted-foreground">
                Unified theme + word pre-fill picker (replaces old template selector):
              </p>
              <CraftThemePicker
                selected="none"
                onSelect={(id) => console.log("Theme selected:", id)}
                onRevealTemplate={(t) => console.log("Reveal template:", t)}
                onPrefillWords={(w) => console.log("Pre-fill words:", w)}
                currentRevealMessage=""
                showWordSection={true}
              />
            </section>

            {/* ── Activity Calendar ── */}
            <section className="space-y-3 rounded-xl border border-border/30 p-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Clock size={14} /> Activity Calendar
              </h2>
              <p className="text-xs text-muted-foreground">
                Monthly calendar from the Stats page — shows daily challenge completions.
              </p>
              <ActivityCalendar />
            </section>

            {/* ── Data Controls ── */}
            <section className="space-y-3 rounded-xl border border-border/30 p-4">
              <h2 className="text-sm font-semibold text-foreground">Data Controls</h2>
              <p className="text-xs text-muted-foreground">
                Generate or clear demo data to test features with realistic numbers.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    import("@/lib/demoStats").then((mod) => {
                      mod.generateDemoSolves(50);
                      window.location.reload();
                    });
                  }}
                >
                  Generate 50 Demo Solves
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    import("@/lib/demoStats").then((mod) => {
                      mod.clearDemoSolves();
                      window.location.reload();
                    });
                  }}
                >
                  Clear Demo Solves
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    localStorage.removeItem("puzzlecraft-milestones-shown");
                    localStorage.removeItem("puzzlecraft-milestones-celebrated");
                    window.location.reload();
                  }}
                >
                  Reset Milestones
                </Button>
              </div>
            </section>
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* TAB 2: PREMIUM                                                */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <TabsContent value="premium" className="space-y-6 mt-4">

            {/* ── Upgrade Modal ── */}
            <section className="space-y-3 rounded-xl border border-border/30 p-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Crown size={14} /> Upgrade Modal (Bottom Sheet)
              </h2>
              <p className="text-xs text-muted-foreground">
                The Puzzlecraft+ upsell modal. Shows pricing, features, purchase CTA, and restore button.
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={() => setUpgradeOpen(true)}>
                  Open Current Modal
                </Button>
                <Button size="sm" variant="outline" onClick={() => setUpgradeNextOpen(true)}>
                  Open New Paywall (preview)
                </Button>
              </div>
            </section>

            {/* ── Premium Gate Component ── */}
            <section className="space-y-3 rounded-xl border border-border/30 p-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Shield size={14} /> PremiumGate Wrapper
              </h2>
              <p className="text-xs text-muted-foreground">
                Wraps content and shows a blurred teaser + upgrade CTA for non-premium users.
              </p>
              <PremiumGate feature="Advanced Analytics" description="Track accuracy, trends, and personal bests">
                <div className="rounded-xl border bg-card p-4 space-y-2">
                  <p className="text-sm font-semibold text-foreground">🎯 Premium Content Here</p>
                  <p className="text-xs text-muted-foreground">This would be premium analytics, exclusive features, etc.</p>
                </div>
              </PremiumGate>
            </section>

            {/* ── Premium Badge ── */}
            <section className="space-y-3 rounded-xl border border-border/30 p-4">
              <h2 className="text-sm font-semibold text-foreground">Premium Badge & Lock Row</h2>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm text-foreground">Inline badge:</span>
                <PremiumBadge />
              </div>
              <PremiumLockRow label="Extreme difficulty" onUpgrade={() => setUpgradeOpen(true)} />
              <PremiumLockRow label="Insane difficulty" onUpgrade={() => setUpgradeOpen(true)} />
              <PremiumLockRow label="Unlimited crafts" onUpgrade={() => setUpgradeOpen(true)} />
            </section>

            {/* ── Premium Locked Card ── */}
            <section className="space-y-3 rounded-xl border border-border/30 p-4">
              <h2 className="text-sm font-semibold text-foreground">Premium Locked Cards</h2>
              <p className="text-xs text-muted-foreground">
                Two states: "Coming Soon" (pre-launch) and "Unlock" (post-launch).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <PremiumLockedCard comingSoon />
                <PremiumLockedCard onUpgrade={() => setUpgradeOpen(true)} />
              </div>
            </section>

            {/* ── Stats Premium Preview ── */}
            <section className="space-y-3 rounded-xl border border-border/30 p-4">
              <h2 className="text-sm font-semibold text-foreground">Stats Premium Preview (Blurred Teaser)</h2>
              <p className="text-xs text-muted-foreground">
                Shown on the Stats page for non-premium users — blurred cards + upgrade overlay.
              </p>
              <StatsPremiumPreview onUpgrade={() => setUpgradeOpen(true)} />
            </section>

            {/* ── Login Premium Preview ── */}
            <section className="space-y-3 rounded-xl border border-border/30 p-4">
              <h2 className="text-sm font-semibold text-foreground">Login Premium Preview</h2>
              <p className="text-xs text-muted-foreground">
                Shown on the Login page — lighter blurred teaser with "Coming soon" overlay.
              </p>
              <LoginPremiumPreview />
            </section>

            {/* ── Premium Stats ── */}
            <section className="space-y-3 rounded-xl border border-border/30 p-4">
              <h2 className="text-sm font-semibold text-foreground">Full Premium Stats & Insights</h2>
              <p className="text-xs text-muted-foreground">
                The full premium analytics panel: rating, milestones, accuracy insights, personal bests, solve history.
              </p>
              <Button size="sm" onClick={() => setShowPremiumStats(!showPremiumStats)}>
                {showPremiumStats ? "Hide" : "Show Premium Stats"}
              </Button>
              {showPremiumStats && (
                <div className="mt-3">
                  <PremiumStats />
                </div>
              )}
            </section>
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* TAB 3: iOS APP                                                */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <TabsContent value="ios" className="space-y-6 mt-4">

            {/* ── Weekly Pack Card ── */}
            <section className="space-y-3 rounded-xl border border-border/30 p-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Puzzle size={14} /> Weekly Pack Card
              </h2>
              <p className="text-xs text-muted-foreground">
                Featured weekly puzzle pack shown on the iOS Play tab. Shows progress and unlock state.
              </p>
              <div className="max-w-sm">
                <WeeklyPackCard />
              </div>
            </section>

            {/* ── Streak Shield Banner ── */}
            <section className="space-y-3 rounded-xl border border-border/30 p-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Shield size={14} /> Streak Shield Banner
              </h2>
              <p className="text-xs text-muted-foreground">
                Shows streak protection status — auto-used, ready, or at-risk states.
              </p>
              <div className="space-y-3 max-w-sm">
                {/* State A: Streak at risk (simulated) */}
                <div className="flex w-full items-center justify-between rounded-2xl border border-border/50 bg-muted/30 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Shield size={14} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Protect your 12-day streak with Streak Shield
                    </span>
                  </div>
                  <span className="text-xs font-medium text-primary">Upgrade</span>
                </div>

                {/* State B: Shield ready */}
                <div className="flex items-center justify-center gap-1.5 py-1">
                  <Shield size={11} className="text-primary/60" />
                  <span className="text-[11px] text-muted-foreground">
                    2 Streak Shields ready
                  </span>
                </div>

                {/* State C: Shield auto-used */}
                <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
                  <Shield size={16} className="text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      Streak Shield activated
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Your 12-day streak was protected while you were away.
                      You have 1 shield remaining.
                    </p>
                  </div>
                  <button className="text-muted-foreground hover:text-foreground transition-colors mt-0.5">
                    <X size={14} />
                  </button>
                </div>
              </div>
            </section>

            {/* ── Daily Leaderboard ── */}
            <section className="space-y-3 rounded-xl border border-border/30 p-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Trophy size={14} /> Daily Leaderboard
              </h2>
              <p className="text-xs text-muted-foreground">
                Shows today's daily challenge leaderboard. Locked state shown when user hasn't completed today.
              </p>
              <div className="max-w-sm space-y-4">
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-2">Not completed today:</p>
                  <DailyLeaderboard hasCompletedToday={false} />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-2">Completed today:</p>
                  <DailyLeaderboard hasCompletedToday={true} />
                </div>
              </div>
            </section>

            {/* ── iOS Tab Bar Preview ── */}
            <section className="space-y-3 rounded-xl border border-border/30 p-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Smartphone size={14} /> iOS Tab Bar
              </h2>
              <p className="text-xs text-muted-foreground">
                Native-feel bottom tab bar with spring animations. Only shown in the native iOS app.
              </p>
              <div className="max-w-sm mx-auto rounded-2xl border bg-card overflow-hidden">
                <div className="h-32 flex items-center justify-center text-muted-foreground/30 text-sm">
                  (App content area)
                </div>
                {/* Mock tab bar — static representation */}
                <div className="border-t border-border/40 bg-background/95 backdrop-blur-sm px-2 py-2">
                  <div className="flex items-center justify-around">
                    {[
                      { icon: "🎲", label: "Play", active: true },
                      { icon: "🎨", label: "Create", active: false, badge: 0 },
                      { icon: "📊", label: "Stats", active: false },
                      { icon: "👤", label: "Account", active: false },
                    ].map((tab) => (
                      <div key={tab.label} className="flex flex-col items-center gap-0.5 relative">
                        <span className={cn("text-lg", tab.active ? "" : "opacity-40")}>{tab.icon}</span>
                        <span className={cn("text-[10px]", tab.active ? "text-primary font-semibold" : "text-muted-foreground")}>
                          {tab.label}
                        </span>
                        {tab.badge ? (
                          <span className="absolute -top-1 -right-2 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                            {tab.badge}
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* ── Friend Activity Feed (mock) ── */}
            <section className="space-y-3 rounded-xl border border-border/30 p-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users size={14} /> Friend Activity Feed
              </h2>
              <p className="text-xs text-muted-foreground">
                Shows recent friend puzzle activity — solves and sends. Fetches from craft_recipients in real-time.
              </p>
              <div className="max-w-sm space-y-2">
                {[
                  { name: "Alex", action: "solved your puzzle", time: "2m ago", emoji: "✅" },
                  { name: "Jordan", action: "sent you a puzzle", time: "1h ago", emoji: "📩" },
                  { name: "Sam", action: "beat your time!", time: "3h ago", emoji: "🏆" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-border/40 bg-card px-3 py-2.5">
                    <span className="text-lg">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{item.name}</span>{" "}
                        <span className="text-muted-foreground">{item.action}</span>
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{item.time}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Puzzle Type Picker (mock) ── */}
            <section className="space-y-3 rounded-xl border border-border/30 p-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Puzzle size={14} /> Puzzle Type Picker (Difficulty Sheet)
              </h2>
              <p className="text-xs text-muted-foreground">
                Bottom sheet shown when tapping a puzzle type tile. Shows difficulty options with premium locks.
              </p>
              <div className="max-w-sm mx-auto rounded-2xl border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border/40">
                  <p className="text-sm font-semibold text-foreground">Crossword</p>
                  <p className="text-xs text-muted-foreground">Classic clue-based word grid</p>
                </div>
                <div className="divide-y divide-border/30">
                  {[
                    { label: "Easy", subtitle: "Great for beginners", locked: false },
                    { label: "Medium", subtitle: "A balanced challenge", locked: false },
                    { label: "Hard", subtitle: "For experienced solvers", locked: false },
                    { label: "Extreme", subtitle: "Push your limits", locked: true },
                    { label: "Insane", subtitle: "Only for the elite", locked: true },
                  ].map((d) => (
                    <div key={d.label} className={cn(
                      "flex items-center justify-between px-4 py-3",
                      d.locked && "opacity-50"
                    )}>
                      <div>
                        <p className="text-sm font-medium text-foreground">{d.label}</p>
                        <p className="text-xs text-muted-foreground">{d.subtitle}</p>
                      </div>
                      {d.locked && (
                        <div className="flex items-center gap-1 text-xs text-primary">
                          <Crown size={12} /> Plus
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* TAB 4: NOTIFICATIONS                                          */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <TabsContent value="notifications" className="space-y-6 mt-4">


            {/* ── Push Notification Payloads ── */}
            <section className="space-y-3 rounded-xl border border-border/30 p-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Smartphone size={14} /> Push Notification Payloads
              </h2>
              <p className="text-xs text-muted-foreground">
                Reference payloads sent from the server via Web Push / APNs.
              </p>
              <div className="space-y-3">
                {[
                  {
                    title: "Streak at risk 🔥",
                    body: "You haven't played today — your 7-day streak is at risk!",
                    trigger: "Cron job, 8pm local if no solve",
                  },
                  {
                    title: "Alex solved your puzzle! 🏆",
                    body: "They finished in 3:22 — can you set a harder challenge?",
                    trigger: "craft_recipients.completed_at update",
                  },
                  {
                    title: "New puzzle from Jordan 📩",
                    body: "A word search is waiting for you — think you can beat their time?",
                    trigger: "shared_puzzles.insert",
                  },
                  {
                    title: "Quick thought for you",
                    body: "(coded private message)",
                    trigger: "messages.insert (private system)",
                  },
                ].map((notif, i) => (
                  <div key={i} className="rounded-xl border border-border/40 bg-card overflow-hidden">
                    {/* iOS notification style */}
                    <div className="flex items-start gap-3 px-4 py-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Puzzle size={18} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-foreground">{notif.title}</p>
                          <span className="text-[10px] text-muted-foreground">now</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{notif.body}</p>
                      </div>
                    </div>
                    <div className="px-4 py-1.5 bg-muted/30 border-t border-border/20">
                      <p className="text-[10px] text-muted-foreground/60">
                        Trigger: {notif.trigger}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Notification Settings Mock ── */}
            <section className="space-y-3 rounded-xl border border-border/30 p-4">
              <h2 className="text-sm font-semibold text-foreground">Notification Settings</h2>
              <p className="text-xs text-muted-foreground">
                User-facing notification preferences available in the private settings.
              </p>
              <div className="max-w-sm space-y-2">
                {[
                  { label: "Streak reminders", desc: "Daily reminder if you haven't played", on: true },
                  { label: "Friend activity", desc: "When friends solve your puzzles", on: true },
                  { label: "Push notifications", desc: "Alerts when app is closed", on: false },
                ].map((setting) => (
                  <div key={setting.label} className="flex items-center justify-between rounded-xl border border-border/40 bg-card px-4 py-3">
                    <div>
                      <p className="text-sm text-foreground">{setting.label}</p>
                      <p className="text-[11px] text-muted-foreground">{setting.desc}</p>
                    </div>
                    <div className={cn(
                      "w-10 h-6 rounded-full transition-colors relative",
                      setting.on ? "bg-primary" : "bg-muted"
                    )}>
                      <div className={cn(
                        "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
                        setting.on ? "translate-x-4" : "translate-x-0.5"
                      )} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Paywall Timing Triggers ── */}
            <section className="space-y-3 rounded-xl border border-border/30 p-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Zap size={14} /> Paywall Timing Triggers
              </h2>
              <p className="text-xs text-muted-foreground">
                The upgrade modal fires at high-emotion moments. Each trigger is gated to once per 48 hours.
              </p>
              <div className="space-y-2 max-w-sm">
                {[
                  { trigger: "After 7-day streak", icon: "🔥", condition: "streak ≥ 7 && !shown in 48h" },
                  { trigger: "After friend solves your puzzle", icon: "🏆", condition: "craft_recipients.completed_at" },
                  { trigger: "After completing Hard difficulty", icon: "💪", condition: "difficulty ≥ hard && !shown in 48h" },
                  { trigger: "After 3rd solve in a session", icon: "⚡", condition: "sessionSolves ≥ 3 && !shown in 48h" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-border/40 bg-card px-3 py-2.5">
                    <span className="text-lg mt-0.5">{item.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.trigger}</p>
                      <p className="text-[10px] font-mono text-muted-foreground/60">{item.condition}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* TAB: CRAFT ANALYTICS                                            */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <TabsContent value="craft" className="space-y-6 mt-4">
            <section className="space-y-3 rounded-xl border border-border/30 p-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Star size={14} /> Craft Analytics Card
              </h2>
              <p className="text-xs text-muted-foreground">
                Shows puzzle creators how their shared puzzles are performing — recipients, completion rates, solve times, and a solver leaderboard.
              </p>

              {/* Mock analytics card — same visual structure as CraftAnalyticsCard */}
              <div className="max-w-md">
                <MockCraftAnalytics
                  title="Weekend Brain Teaser"
                  totalSent={8}
                  totalStarted={6}
                  totalCompleted={5}
                  avgTime={243}
                  fastestTime={128}
                  creatorTime={195}
                  solvers={[
                    { name: "Alex", time: 128 },
                    { name: "Jordan", time: 172 },
                    { name: "Sam", time: 195 },
                    { name: "Casey", time: 310 },
                    { name: "Morgan", time: 412 },
                  ]}
                />
              </div>
            </section>

            <section className="space-y-3 rounded-xl border border-border/30 p-4">
              <h2 className="text-sm font-semibold text-foreground">Empty State</h2>
              <p className="text-xs text-muted-foreground">
                What creators see before anyone has solved their puzzle.
              </p>
              <div className="max-w-md">
                <MockCraftAnalytics
                  title="My First Puzzle"
                  totalSent={3}
                  totalStarted={0}
                  totalCompleted={0}
                  avgTime={null}
                  fastestTime={null}
                  creatorTime={145}
                  solvers={[]}
                />
              </div>
            </section>
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* TAB 5: PATTERNS                                               */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <TabsContent value="patterns" className="space-y-6 mt-4">
            <NonogramPreview />
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* TAB: SHARE CARDS                                               */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <TabsContent value="sharecards" className="space-y-6 mt-4">
            <ShareCardPreviews />
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* TAB: WEEKLY PACKS                                             */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <TabsContent value="weeklypacks" className="space-y-6 mt-4">
            <WeeklyPacksPreview />
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* TAB: RANKING                                                  */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <TabsContent value="ranking" className="space-y-6 mt-4">
            <RankingPreview />
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Global overlays ── */}
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
      {upgradeNextOpen && (
        <UpgradeModalNextUI
          annual={upgradeNextAnnual}
          setAnnual={setUpgradeNextAnnual}
          purchasing={false}
          result="idle"
          errorMessage={null}
          native={false}
          onPurchase={() => {}}
          onRestore={() => {}}
          onClose={() => setUpgradeNextOpen(false)}
        />
      )}
      

      {/* ── Onboarding overlay ── */}
      {showOnboarding && (
        <OnboardingFlow onComplete={() => setShowOnboarding(false)} />
      )}
    </Layout>
  );
}
