/**
 * Puzzlecraft+ Milestone System
 *
 * Lightweight client-side milestones that trigger toast notifications
 * when users hit solve count, streak, or skill tier thresholds.
 * Tracks which milestones have already been shown in localStorage.
 */
import { getSolveRecords, type SolveRecord } from "./solveTracker";
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
  /** Optional quote shown on the share card */
  quote?: string;
}

/**
 * Emoji mapping for milestone icons.
 *
 * ⚠️ CRITICAL: This is what the achievement share card must use to render
 * the icon. Using `m.icon` directly (the string "flame") renders as text.
 * Use `MILESTONE_ICON_EMOJI[m.icon]` wherever the icon appears in share
 * cards, canvas renders, or OG image templates.
 *
 * Find in MilestoneShareCard or equivalent and replace:
 *   <h1>{milestone.icon}</h1>          ← WRONG — renders "flame" as text
 *   <h1>{MILESTONE_ICON_EMOJI[milestone.icon]}</h1>  ← CORRECT — renders 🔥
 */
export const MILESTONE_ICON_EMOJI: Record<MilestoneIcon, string> = {
  puzzle:  "🧩",
  flame:   "🔥",
  trophy:  "🏆",
  medal:   "🥇",
  zap:     "⚡",
  crown:   "👑",
  target:  "🎯",
  award:   "🏅",
  bolt:    "⚡",
};

const SOLVE_MILESTONES: { count: number; milestone: Milestone }[] = [
  { count: 10,  milestone: { id: "solves-10",  label: "10 Puzzles Solved",  icon: "puzzle", quote: "Every puzzle solved is a mind sharpened." } },
  { count: 50,  milestone: { id: "solves-50",  label: "50 Puzzles Solved",  icon: "flame",  quote: "Consistency is the secret. Keep that streak burning." } },
  { count: 100, milestone: { id: "solves-100", label: "100 Puzzles Solved", icon: "trophy", quote: "100 down. You're in rare company." } },
  { count: 250, milestone: { id: "solves-250", label: "250 Puzzles Solved", icon: "medal",  quote: "This is what dedication looks like." } },
];

const STREAK_MILESTONES: { days: number; milestone: Milestone }[] = [
  { days: 3,  milestone: { id: "streak-3",  label: "3-Day Streak",  icon: "flame",  quote: "Three in a row. The habit is forming." } },
  { days: 7,  milestone: { id: "streak-7",  label: "7-Day Streak",  icon: "zap",    quote: "One full week. You keep showing up." } },
  { days: 14, milestone: { id: "streak-14", label: "14-Day Streak", icon: "bolt",   quote: "Two weeks strong. This is real commitment." } },
  { days: 30, milestone: { id: "streak-30", label: "30-Day Streak", icon: "crown",  quote: "30 days. You've earned this." } },
];

const TIER_ORDER: SkillTier[] = ["Skilled", "Advanced", "Expert"];
const TIER_MILESTONES: { tier: SkillTier; milestone: Milestone }[] = [
  { tier: "Skilled",  milestone: { id: "tier-skilled",  label: "Skilled Rank Reached",  icon: "target", quote: "Your solve speed is climbing. Keep pushing." } },
  { tier: "Advanced", milestone: { id: "tier-advanced", label: "Advanced Rank Reached", icon: "award",  quote: "Advanced. Most players never get here." } },
  { tier: "Expert",   milestone: { id: "tier-expert",   label: "Expert Rank Reached",   icon: "medal",  quote: "Expert tier. You're among the very best." } },
];

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

export function getUncelebratedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(CELEBRATED_KEY);
    const celebrated = raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
    const shown = getShownIds();
    const uncelebrated = new Set<string>();
    for (const id of shown) {
      if (!celebrated.has(id)) uncelebrated.add(id);
    }
    return uncelebrated;
  } catch {
    return new Set();
  }
}

export function markCelebrated(ids: string[]) {
  try {
    const raw = localStorage.getItem(CELEBRATED_KEY);
    const celebrated: Set<string> = raw ? new Set(JSON.parse(raw)) : new Set();
    for (const id of ids) celebrated.add(id);
    localStorage.setItem(CELEBRATED_KEY, JSON.stringify([...celebrated]));
  } catch {}
}

// ── Check & notify ──

export function checkMilestones() {
  const shown = getShownIds();
  const newMilestones: Milestone[] = [];

  const solveCount = getSolveRecords().filter((r) => r.solveTime >= 10).length;
  for (const { count, milestone } of SOLVE_MILESTONES) {
    if (solveCount >= count && !shown.has(milestone.id)) {
      newMilestones.push(milestone);
    }
  }

  try {
    const streak = getDailyStreak();
    for (const { days, milestone } of STREAK_MILESTONES) {
      if (streak.current >= days && !shown.has(milestone.id)) {
        newMilestones.push(milestone);
      }
    }
  } catch {}

  const records = getSolveRecords().filter((r) => r.solveTime >= 10);
  if (records.length >= 5) {
    const rating = computePlayerRating(records);
    const tier = getSkillTier(rating, records.length);
    const tierIdx = TIER_ORDER.indexOf(tier);
    for (const { tier: t, milestone } of TIER_MILESTONES) {
      if (TIER_ORDER.indexOf(t) <= tierIdx && tierIdx >= 0 && !shown.has(milestone.id)) {
        newMilestones.push(milestone);
      }
    }
  }

  newMilestones.forEach((m, i) => {
    setTimeout(() => {
      // Use emoji in toast — not the raw icon string
      const emoji = MILESTONE_ICON_EMOJI[m.icon];
      toast.success(`${emoji} ${m.label}`, {
        description: m.quote ?? "Keep it up!",
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
  /** Use MILESTONE_ICON_EMOJI[icon] to render this as an emoji */
  emoji: string;
  /** Optional motivational quote for share cards */
  quote?: string;
  state: MilestoneState;
  current: number;
  target: number;
  progressText: string;
  isNext: boolean;
}

export function getAllMilestones(overrideRecords?: SolveRecord[]): MilestoneWithProgress[] {
  const baseRecords = overrideRecords ?? getSolveRecords();
  const filtered = baseRecords.filter((r) => r.solveTime >= 10);
  const solveCount = filtered.length;
  const records = filtered;
  const rating = records.length >= 5 ? computePlayerRating(records) : 0;
  const tier = getSkillTier(rating, records.length);
  const tierIdx = TIER_ORDER.indexOf(tier);

  let streakCurrent = 0;
  try { streakCurrent = getDailyStreak().current; } catch {}

  const all: MilestoneWithProgress[] = [];

  for (const { count, milestone } of SOLVE_MILESTONES) {
    const achieved = solveCount >= count;
    const progress = Math.min(solveCount, count);
    const ratio = progress / count;
    const state: MilestoneState = achieved ? "achieved" : ratio >= 0.3 ? "in-progress" : "locked";
    all.push({
      ...milestone,
      emoji: MILESTONE_ICON_EMOJI[milestone.icon],
      state,
      current: progress,
      target: count,
      progressText: `${progress} / ${count} puzzles`,
      isNext: false,
    });
  }

  for (const { days, milestone } of STREAK_MILESTONES) {
    const achieved = streakCurrent >= days;
    const progress = Math.min(streakCurrent, days);
    const ratio = progress / days;
    const state: MilestoneState = achieved ? "achieved" : ratio >= 0.3 ? "in-progress" : "locked";
    all.push({
      ...milestone,
      emoji: MILESTONE_ICON_EMOJI[milestone.icon],
      state,
      current: progress,
      target: days,
      progressText: `Day ${progress} of ${days}`,
      isNext: false,
    });
  }

  for (const { tier: t, milestone } of TIER_MILESTONES) {
    const achieved = TIER_ORDER.indexOf(t) <= tierIdx && tierIdx >= 0;
    const threshold = TIER_RATING_THRESHOLDS[t] ?? 700;
    const progress = Math.min(rating, threshold);
    const ratio = progress / threshold;
    const state: MilestoneState = achieved ? "achieved" : ratio >= 0.3 ? "in-progress" : "locked";
    all.push({
      ...milestone,
      emoji: MILESTONE_ICON_EMOJI[milestone.icon],
      state,
      current: progress,
      target: threshold,
      progressText: `${progress} / ${threshold} rating`,
      isNext: false,
    });
  }

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
  if (bestNextIdx >= 0) all[bestNextIdx].isNext = true;

  return all;
}
