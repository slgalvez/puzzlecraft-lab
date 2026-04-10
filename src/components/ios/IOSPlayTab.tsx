/**
 * IOSPlayTab.tsx — CORRECTED + LAUNCH-READY
 * src/components/ios/IOSPlayTab.tsx
 *
 * FIXES vs previous session output:
 * 1. Correct path: src/components/ios/ (confirmed from Index.tsx import)
 * 2. Function name fix: getCurrentWeeklyPack (was getCurrentWeekPack — doesn't exist)
 * 3. Account argument: getCurrentWeeklyPack(accountShape) — was called with no args
 * 4. Added weekPack.isUnlocked gate on nav — locked packs open upgrade modal
 * 5. Removed incorrect UpgradeModal trigger="weekly-pack" prop (base modal handles trigger internally)
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Sun, Infinity, ChevronRight, Flame, Zap, Crown,
} from "lucide-react";
import PuzzleIcon from "@/components/puzzles/PuzzleIcon";
import { CATEGORY_INFO, type PuzzleCategory } from "@/lib/puzzleTypes";
import { getDailyStreak } from "@/lib/dailyChallenge";
import { usePremiumAccess } from "@/lib/premiumAccess";
import UpgradeModal from "@/components/account/UpgradeModal";
import { getCurrentWeeklyPack } from "@/lib/weeklyPacks";
import { useUserAccount } from "@/contexts/UserAccountContext";
import DailyLeaderboard from "@/components/DailyLeaderboard";
import FriendActivityFeed from "@/components/FriendActivityFeed";

const ALL_CATEGORIES: PuzzleCategory[] = [
  "crossword", "word-fill", "number-fill", "sudoku",
  "word-search", "kakuro", "nonogram", "cryptogram",
];

const IOSPlayTab = () => {
  const navigate = useNavigate();
  const { account, subscribed } = useUserAccount();
  const { isPremium, showUpgradeCTA } = usePremiumAccess();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const streak = getDailyStreak();

  // FIX: correct function name + correct account shape argument
  const weekPack = getCurrentWeeklyPack(
    account
      ? { subscribed: subscribed ?? false, isAdmin: account.isAdmin }
      : null
  );

  return (
    <div className="flex flex-col gap-5 px-4 pt-5 pb-8 max-w-lg mx-auto">

      {/* ── Greeting + streak ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground leading-tight">
            {account?.displayName
              ? `Hi, ${account.displayName.split(" ")[0]}`
              : "Play"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pick a puzzle to get started
          </p>
        </div>

        {streak.current > 0 && (
          <div className="flex items-center gap-1.5 rounded-full border border-orange-400/30 bg-orange-400/10 px-3 py-1.5">
            <Flame size={14} className="text-orange-500 animate-pulse" />
            <span className="font-mono text-sm font-bold text-orange-500">
              {streak.current}
            </span>
          </div>
        )}
      </div>

      {/* ── Daily challenge card ──────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => navigate("/daily")}
        className="w-full rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-4 text-left active:scale-[0.97] touch-manipulation transition-transform"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="rounded-full bg-primary/15 p-2">
              <Sun size={18} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm leading-tight">
                Daily Challenge
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {streak.current > 0
                  ? `${streak.current}-day streak · Keep it going!`
                  : "Start your streak today"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    i < Math.min(streak.current, 3)
                      ? "bg-primary"
                      : "bg-muted-foreground/20",
                  )}
                />
              ))}
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </div>
        </div>
      </button>

      {/* ── Endless mode card ─────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => {
          const cat = ALL_CATEGORIES[Math.floor(Math.random() * ALL_CATEGORIES.length)];
          navigate(`/quick-play/${cat}?mode=endless`);
        }}
        className="w-full rounded-2xl border bg-card p-4 text-left active:scale-[0.97] touch-manipulation transition-transform"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="rounded-full bg-secondary p-2">
              <Infinity size={18} className="text-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm leading-tight">
                Endless Mode
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Adaptive difficulty · keeps you in the zone
              </p>
            </div>
          </div>
          <ChevronRight size={16} className="text-muted-foreground" />
        </div>
      </button>

      {/* ── Weekly pack card ─────────────────────────────────────────── */}
      {weekPack && (
        <button
          type="button"
          onClick={() =>
            weekPack.isUnlocked
              ? navigate(`/weekly-pack/${weekPack.id}`)
              : setUpgradeOpen(true)
          }
          className="w-full rounded-2xl border bg-card p-4 text-left active:scale-[0.97] touch-manipulation transition-transform"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl leading-none shrink-0">{weekPack.emoji}</span>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-foreground text-sm leading-tight">
                    {weekPack.theme}
                  </p>
                  {!weekPack.isUnlocked && (
                    <Crown size={11} className="text-primary" />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {weekPack.isUnlocked
                    ? "Weekly pack · 5 puzzles"
                    : weekPack.unlocksIn
                      ? `Unlocks in ${weekPack.unlocksIn}`
                      : "Puzzlecraft+ exclusive"}
                </p>
              </div>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </div>
        </button>
      )}

      {/* ── Puzzle type grid ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-base font-semibold text-foreground">
            Puzzle Types
          </h2>
          <button
            type="button"
            onClick={() => navigate("/puzzles")}
            className="text-xs font-medium text-primary touch-manipulation py-1"
          >
            All puzzles
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {ALL_CATEGORIES.map((cat) => {
            const info = CATEGORY_INFO[cat];
            return (
              <button
                key={cat}
                type="button"
                onClick={() => navigate(`/quick-play/${cat}?d=medium`)}
                className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3.5 text-left active:scale-[0.96] touch-manipulation transition-transform min-h-[60px]"
              >
                <PuzzleIcon type={cat} size={22} className="text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight truncate">
                    {info.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                    {info.description?.slice(0, 28) ?? ""}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Difficulty upgrade teaser ─────────────────────────────────── */}
      {showUpgradeCTA && (
        <button
          type="button"
          onClick={() => setUpgradeOpen(true)}
          className="w-full flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-4 text-left active:scale-[0.97] touch-manipulation transition-transform"
        >
          <div className="rounded-full bg-primary/15 p-2">
            <Zap size={16} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">
              Unlock Extreme & Insane
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Two extra difficulty tiers with Puzzlecraft+
            </p>
          </div>
          <Crown size={14} className="text-primary shrink-0" />
        </button>
      )}

      {/* ── Daily Leaderboard ─────────────────────────────────────────── */}
      <div>
        <h2 className="font-display text-base font-semibold text-foreground mb-3">
          Today's Leaderboard
        </h2>
        <DailyLeaderboard compact />
      </div>

      {/* ── Friend Activity (signed-in only) ─────────────────────────── */}
      {account && (
        <div>
          <h2 className="font-display text-base font-semibold text-foreground mb-3">
            Friend Activity
          </h2>
          <FriendActivityFeed compact maxItems={5} />
        </div>
      )}

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  );
};

export default IOSPlayTab;
