import { useState, useCallback, useMemo, useEffect } from "react";
import { buildCraftShareText, buildSolveResultShareText } from "@/lib/craftShare";
import Layout from "@/components/layout/Layout";
import CompletionPanel from "@/components/puzzles/CompletionPanel";
import MilestoneModal, { type MilestoneToShow } from "@/components/puzzles/MilestoneModal";
import PremiumStats from "@/components/account/PremiumStats";
import { StatsPremiumPreview, LoginPremiumPreview } from "@/components/account/PremiumPreview";
import PremiumLockedCard from "@/components/account/PremiumLockedCard";
import UpgradeModal from "@/components/account/UpgradeModal";

import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { CraftTemplateSelector } from "@/components/craft/CraftTemplateSelector";
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
import { Trophy, Flame, Target, Medal, Zap, Crown, Award, Star, Puzzle, Clock, Users, Bell, Smartphone, Eye, Shield, Sparkles, X } from "lucide-react";
import { generateNonogram } from "@/lib/generators/nonogram";

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
    label: "Daily Challenge Result",
    description: "Sent when a user shares their daily challenge completion",
    text: `Just solved today's Puzzlecraft challenge 🧠\n\nCrossword • Medium • 4:32\n🔥 7-day streak\n\nCan you beat this time?\n\nPlay: https://puzzlecraft-lab.lovable.app/play?code=daily-2026-04-03`,
  },
  {
    label: "Puzzle Result (Quick Play)",
    description: "Sent when a user shares a completed puzzle from Quick Play",
    text: `Just tackled a Puzzlecraft puzzle 🧠\n\nSudoku • Hard • 12:05\n\nCan you beat this time?\n\nPlay: https://puzzlecraft-lab.lovable.app/play?code=sudoku-307144639-hard\n\nPuzzle Code: 307144639`,
  },
  {
    label: "Crafted Puzzle (with challenge time)",
    description: "Sent when a creator shares a crafted puzzle with a challenge time set",
    text: buildCraftShareText("Birthday Brain Teaser", "Alex", "https://puzzlecraft-lab.lovable.app/s/abc123-craft-id", "crossword", 202),
  },
  {
    label: "Crafted Puzzle (no challenge)",
    description: "Sent when a creator shares a crafted puzzle without solving it first",
    text: buildCraftShareText(undefined, "Jordan", "https://puzzlecraft-lab.lovable.app/s/xyz789-craft-id", "word-search", null),
  },
  {
    label: "Solve Result (beat creator)",
    description: "Sent when a recipient solves a crafted puzzle faster than the creator",
    text: buildSolveResultShareText("Birthday Brain Teaser", "crossword", 185, 202, "https://puzzlecraft-lab.lovable.app/s/abc123-craft-id"),
  },
  {
    label: "Solve Result (missed)",
    description: "Sent when a recipient solves but doesn't beat the creator's time",
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

            {/* ── Craft Template Selector ── */}
            <section className="space-y-3 rounded-xl border border-border/30 p-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles size={14} /> Craft Template Selector
              </h2>
              <p className="text-xs text-muted-foreground">
                Template picker shown in Step 1 of the craft flow. Try each puzzle type:
              </p>
              {(["crossword", "word-search", "word-fill", "cryptogram"] as const).map((type) => (
                <div key={type} className="space-y-1">
                  <p className="text-[11px] font-medium text-muted-foreground capitalize">{type}</p>
                  <CraftTemplateSelector
                    puzzleType={type}
                    onSelect={(t) => console.log("Selected template:", t.id, t.label)}
                  />
                </div>
              ))}
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
              <Button size="sm" onClick={() => setUpgradeOpen(true)}>
                Open Upgrade Modal
              </Button>
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
        </Tabs>
      </div>

      {/* ── Global overlays ── */}
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
      

      {/* ── Onboarding overlay ── */}
      {showOnboarding && (
        <OnboardingFlow onComplete={() => setShowOnboarding(false)} />
      )}
    </Layout>
  );
}
