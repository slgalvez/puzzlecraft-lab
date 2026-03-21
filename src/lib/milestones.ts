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

/** Returns all milestones with their unlocked status. */
export function getAllMilestones(): { id: string; label: string; emoji: string; unlocked: boolean }[] {
  const shown = getShownIds();
  const solveCount = getSolveRecords().filter((r) => r.solveTime >= 10).length;
  const records = getSolveRecords().filter((r) => r.solveTime >= 10);
  const rating = records.length >= 5 ? computePlayerRating(records) : 0;
  const tier = getSkillTier(rating);
  const tierIdx = TIER_ORDER.indexOf(tier);

  let streakCurrent = 0;
  try { streakCurrent = getDailyStreak().current; } catch {}

  const all: { id: string; label: string; emoji: string; unlocked: boolean }[] = [];

  for (const { count, milestone } of SOLVE_MILESTONES) {
    all.push({ ...milestone, unlocked: solveCount >= count });
  }
  for (const { days, milestone } of STREAK_MILESTONES) {
    all.push({ ...milestone, unlocked: streakCurrent >= days });
  }
  for (const { tier: t, milestone } of TIER_MILESTONES) {
    all.push({ ...milestone, unlocked: TIER_ORDER.indexOf(t) <= tierIdx && tierIdx >= 0 });
  }

  return all;
}
