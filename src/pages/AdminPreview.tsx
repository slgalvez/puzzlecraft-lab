import { useState, useCallback, useMemo } from "react";
import Layout from "@/components/layout/Layout";
import CompletionPanel from "@/components/puzzles/CompletionPanel";
import MilestoneModal, { type MilestoneToShow } from "@/components/puzzles/MilestoneModal";
import PremiumStats from "@/components/account/PremiumStats";
import type { MilestoneIcon } from "@/lib/milestones";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Trophy, Flame, Target, Medal, Zap, Crown, Award, Star, Puzzle } from "lucide-react";
import { generateNonogram } from "@/lib/generators/nonogram";

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

export default function AdminPreview() {
  const [showCompletion, setShowCompletion] = useState(false);
  const [showMilestone, setShowMilestone] = useState(false);
  const [showPremiumStats, setShowPremiumStats] = useState(false);
  const [completionCategory, setCompletionCategory] = useState<string>("crossword");
  const [completionDifficulty, setCompletionDifficulty] = useState<string>("medium");
  const [completionTime, setCompletionTime] = useState(185);
  const [achievedIds, setAchievedIds] = useState<Set<string>>(new Set());
  const [celebratingIds, setCelebratingIds] = useState<Set<string>>(new Set());

  const handleAchieve = useCallback((id: string) => {
    setAchievedIds((prev) => new Set(prev).add(id));
    setCelebratingIds((prev) => new Set(prev).add(id));
    // Clear celebration animation after 1.5s
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
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Preview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Preview UI features with mock data — no need to solve puzzles.
          </p>
        </div>

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

        {/* ── Milestone Tiles with Confetti ── */}
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

        {/* ── Premium Stats / Insights ── */}
        <section className="space-y-3 rounded-xl border border-border/30 p-4">
          <h2 className="text-sm font-semibold text-foreground">Premium Stats & Insights</h2>
          <p className="text-xs text-muted-foreground">
            Shows the full premium analytics panel including milestones progress, accuracy insights, personal bests, and solve history.
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

        {/* ── Nonogram Pattern Preview ── */}
        <NonogramPreview />

        {/* ── Quick actions ── */}
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
      </div>
    </Layout>
  );
}