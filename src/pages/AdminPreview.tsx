import { useState } from "react";
import Layout from "@/components/layout/Layout";
import CompletionPanel from "@/components/puzzles/CompletionPanel";
import MilestoneModal, { type MilestoneToShow } from "@/components/puzzles/MilestoneModal";
import PremiumStats from "@/components/account/PremiumStats";
import type { MilestoneIcon } from "@/lib/milestones";
import { Button } from "@/components/ui/button";

const MOCK_MILESTONES: MilestoneToShow[] = [
  { id: "solves-10", label: "10 Puzzles Solved", icon: "puzzle" },
  { id: "streak-7", label: "7-Day Streak", icon: "flame" },
  { id: "tier-skilled", label: "Skilled Rank Reached", icon: "target" },
];

const ICON_OPTIONS: MilestoneIcon[] = ["puzzle", "flame", "trophy", "medal", "zap", "crown", "target", "award", "bolt"];

export default function AdminPreview() {
  const [showCompletion, setShowCompletion] = useState(false);
  const [showMilestone, setShowMilestone] = useState(false);
  const [showPremiumStats, setShowPremiumStats] = useState(false);
  const [completionCategory, setCompletionCategory] = useState<string>("crossword");
  const [completionDifficulty, setCompletionDifficulty] = useState<string>("medium");
  const [completionTime, setCompletionTime] = useState(185);

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
          <p className="text-[10px] text-muted-foreground/50">
            Click an icon name to preview that specific milestone style.
          </p>
        </section>

        {showMilestone && (
          <MilestoneModal
            milestones={MOCK_MILESTONES}
            onDismiss={() => setShowMilestone(false)}
          />
        )}

        {/* ── What's New Banner ── */}
        <section className="space-y-3 rounded-xl border border-border/30 p-4">
          <h2 className="text-sm font-semibold text-foreground">What's New Banner</h2>
          <p className="text-xs text-muted-foreground">
            This shows the current banner. If you've already dismissed it, clear localStorage key <code className="text-[10px] bg-secondary/30 px-1 py-0.5 rounded">private_whats_new_dismissed</code> to see it again.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              localStorage.removeItem("private_whats_new_dismissed");
              window.location.reload();
            }}
          >
            Reset & Show Banner
          </Button>
          <div className="mt-2">
            <WhatsNewBanner />
          </div>
        </section>

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
                import("@/lib/demoStats").then((m) => {
                  m.generateDemoSolves(50);
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
                import("@/lib/demoStats").then((m) => {
                  m.clearDemoSolves();
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
