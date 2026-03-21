/**
 * Puzzlecraft+ Milestone System
 *
 * Lightweight client-side milestones that trigger toast notifications
 * when users hit solve count, streak, or skill tier thresholds.
 * Tracks which milestones have already been shown in localStorage.
 */
import { getSolveRecords } from "./solveTracker";
import { computePlayerRating, getSkillTier, type SkillTier } from "./solveScoring";
import { getDailyStreak } from "./dailyChallenge";
import { toast } from "sonner";

const STORAGE_KEY = "puzzlecraft-milestones-shown";

// ── Milestone definitions ──

export type MilestoneIcon = "puzzle" | "flame" | "trophy" | "medal" | "zap" | "crown" | "target" | "award" | "bolt";

export type MilestoneState = "locked" | "in-progress" | "achieved";

interface Milestone {
  id: string;
  label: string;
  icon: MilestoneIcon;
}

const SOLVE_MILESTONES: { count: number; milestone: Milestone }[] = [
  { count: 10, milestone: { id: "solves-10", label: "10 Puzzles Solved", icon: "puzzle" } },
  { count: 50, milestone: { id: "solves-50", label: "50 Puzzles Solved", icon: "flame" } },
  { count: 100, milestone: { id: "solves-100", label: "100 Puzzles Solved", icon: "trophy" } },
  { count: 250, milestone: { id: "solves-250", label: "250 Puzzles Solved", icon: "medal" } },
];

const STREAK_MILESTONES: { days: number; milestone: Milestone }[] = [
  { days: 3, milestone: { id: "streak-3", label: "3-Day Streak", icon: "flame" } },
  { days: 7, milestone: { id: "streak-7", label: "7-Day Streak", icon: "zap" } },
  { days: 14, milestone: { id: "streak-14", label: "14-Day Streak", icon: "bolt" } },
  { days: 30, milestone: { id: "streak-30", label: "30-Day Streak", icon: "crown" } },
];

const TIER_ORDER: SkillTier[] = ["Skilled", "Advanced", "Expert"];
const TIER_MILESTONES: { tier: SkillTier; milestone: Milestone }[] = [
  { tier: "Skilled", milestone: { id: "tier-skilled", label: "Skilled Rank Reached", icon: "target" } },
  { tier: "Advanced", milestone: { id: "tier-advanced", label: "Advanced Rank Reached", icon: "award" } },
  { tier: "Expert", milestone: { id: "tier-expert", label: "Expert Rank Reached", icon: "medal" } },
];

// Rating thresholds for tier milestones (maps to getSkillTier bands)
const TIER_RATING_THRESHOLDS: Record<string, number> = {
  Skilled: 700,
  Advanced: 950,
  Expert: 1200,
};

const CELEBRATED_KEY = "puzzlecraft-milestones-celebrated";

// ── Persistence ──

function getShownIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function markShown(id: string) {
  const shown = getShownIds();
  shown.add(id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...shown]));
}

/** Get milestone IDs that were recently achieved and not yet celebrated in the UI. */
export function getUncelebratedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(CELEBRATED_KEY);
    const celebrated = raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
    const shown = getShownIds();
    // Uncelebrated = shown (achieved via toast) but not yet celebrated in UI
    const uncelebrated = new Set<string>();
    for (const id of shown) {
      if (!celebrated.has(id)) uncelebrated.add(id);
    }
    return uncelebrated;
  } catch {
    return new Set();
  }
}

/** Mark milestone IDs as celebrated (animation played). */
export function markCelebrated(ids: string[]) {
  try {
    const raw = localStorage.getItem(CELEBRATED_KEY);
    const celebrated: Set<string> = raw ? new Set(JSON.parse(raw)) : new Set();
    for (const id of ids) celebrated.add(id);
    localStorage.setItem(CELEBRATED_KEY, JSON.stringify([...celebrated]));
  } catch {
    // silently fail
  }
}

// ── Check & notify ──

/**
 * Call after a solve or when visiting the stats page.
 * Shows a toast for any newly reached milestone.
 */
export function checkMilestones() {
  const shown = getShownIds();
  const newMilestones: Milestone[] = [];

  // Solve count
  const solveCount = getSolveRecords().filter((r) => r.solveTime >= 10).length;
  for (const { count, milestone } of SOLVE_MILESTONES) {
    if (solveCount >= count && !shown.has(milestone.id)) {
      newMilestones.push(milestone);
    }
  }

  // Streak
  try {
    const streak = getDailyStreak();
    for (const { days, milestone } of STREAK_MILESTONES) {
      if (streak.current >= days && !shown.has(milestone.id)) {
        newMilestones.push(milestone);
      }
    }
  } catch {
    // daily streak not available
  }

  // Skill tier
  const records = getSolveRecords().filter((r) => r.solveTime >= 10);
  if (records.length >= 5) {
    const rating = computePlayerRating(records);
    const tier = getSkillTier(rating);
    const tierIdx = TIER_ORDER.indexOf(tier);
    for (const { tier: t, milestone } of TIER_MILESTONES) {
      if (TIER_ORDER.indexOf(t) <= tierIdx && tierIdx >= 0 && !shown.has(milestone.id)) {
        newMilestones.push(milestone);
      }
    }
  }

  // Show toasts with staggered delay
  newMilestones.forEach((m, i) => {
    setTimeout(() => {
      toast.success(`Milestone: ${m.label}`, {
        description: "Keep it up!",
        duration: 4000,
      });
      markShown(m.id);
    }, i * 1500);
  });

  return newMilestones.length;
}

export interface MilestoneWithProgress {
  id: string;
  label: string;
  icon: MilestoneIcon;
  state: MilestoneState;
  /** Current progress value */
  current: number;
  /** Target to achieve the milestone */
  target: number;
  /** Human-readable progress text e.g. "32 / 50 puzzles" */
  progressText: string;
  /** Whether this is the next closest milestone to unlock */
  isNext: boolean;
}

/** Returns all milestones with their state, progress, and next-milestone flag. */
export function getAllMilestones(): MilestoneWithProgress[] {
  const solveCount = getSolveRecords().filter((r) => r.solveTime >= 10).length;
  const records = getSolveRecords().filter((r) => r.solveTime >= 10);
  const rating = records.length >= 5 ? computePlayerRating(records) : 0;
  const tier = getSkillTier(rating);
  const tierIdx = TIER_ORDER.indexOf(tier);

  let streakCurrent = 0;
  try { streakCurrent = getDailyStreak().current; } catch {}

  const all: MilestoneWithProgress[] = [];

  // Solve milestones
  for (const { count, milestone } of SOLVE_MILESTONES) {
    const achieved = solveCount >= count;
    const progress = Math.min(solveCount, count);
    const ratio = progress / count;
    const state: MilestoneState = achieved ? "achieved" : ratio >= 0.3 ? "in-progress" : "locked";
    all.push({
      ...milestone,
      state,
      current: progress,
      target: count,
      progressText: `${progress} / ${count} puzzles`,
      isNext: false,
    });
  }

  // Streak milestones
  for (const { days, milestone } of STREAK_MILESTONES) {
    const achieved = streakCurrent >= days;
    const progress = Math.min(streakCurrent, days);
    const ratio = progress / days;
    const state: MilestoneState = achieved ? "achieved" : ratio >= 0.3 ? "in-progress" : "locked";
    all.push({
      ...milestone,
      state,
      current: progress,
      target: days,
      progressText: `Day ${progress} of ${days}`,
      isNext: false,
    });
  }

  // Tier milestones
  for (const { tier: t, milestone } of TIER_MILESTONES) {
    const achieved = TIER_ORDER.indexOf(t) <= tierIdx && tierIdx >= 0;
    const threshold = TIER_RATING_THRESHOLDS[t] ?? 700;
    const progress = Math.min(rating, threshold);
    const ratio = progress / threshold;
    const state: MilestoneState = achieved ? "achieved" : ratio >= 0.3 ? "in-progress" : "locked";
    all.push({
      ...milestone,
      state,
      current: progress,
      target: threshold,
      progressText: `${progress} / ${threshold} rating`,
      isNext: false,
    });
  }

  // Mark the next closest milestone
  let bestNextIdx = -1;
  let bestNextRatio = -1;
  for (let i = 0; i < all.length; i++) {
    if (all[i].state !== "achieved") {
      const ratio = all[i].current / all[i].target;
      if (ratio > bestNextRatio) {
        bestNextRatio = ratio;
        bestNextIdx = i;
      }
    }
  }
  if (bestNextIdx >= 0) {
    all[bestNextIdx].isNext = true;
  }

  return all;
}
