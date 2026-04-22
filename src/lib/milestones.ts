/**
 * milestones.ts
 *
 * 13 milestones across 4 tabs:
 *   Ranked (4) · Solver (5) · Crafter (3) · Social (2)
 *
 * Design principles:
 *   - Milestones describe identity, not behavior counts
 *   - Every milestone has a distinct trigger (no filler counters)
 *   - Unlock copy uses identity language, not praise
 *   - One "isNext" per tab — always a clear target
 *
 * Includes a back-compat shim for legacy consumers
 * (PremiumStats, MilestoneModalManager, MilestoneShareCard, AdminPreview)
 * that read `label`, `icon: MilestoneIcon`, `emoji`, `current`, `target`,
 * `progressText`, and `isNext`.
 */

import { getSolveRecords, type SolveRecord } from "./solveTracker";
import { computePlayerRating, getSkillTier, type SkillTier } from "./solveScoring";
import { getProgressStats } from "./progressTracker";
import { loadSentItems, loadReceivedItems } from "./craftHistory";
import { toast } from "sonner";
import type { PuzzleCategory } from "./puzzleTypes";

// ── Tabs ──────────────────────────────────────────────────────────────────────

export type MilestoneTab = "ranked" | "solver" | "crafter" | "social";

export const MILESTONE_TABS: { id: MilestoneTab; label: string }[] = [
  { id: "ranked",  label: "Ranked"  },
  { id: "solver",  label: "Solver"  },
  { id: "crafter", label: "Crafter" },
  { id: "social",  label: "Social"  },
];

// ── Types ─────────────────────────────────────────────────────────────────────

export type MilestoneState = "achieved" | "in-progress" | "locked";

/** Legacy icon union — kept for back-compat with share cards / modal. */
export type MilestoneIcon =
  | "puzzle" | "flame" | "trophy" | "medal"
  | "zap"    | "crown" | "target" | "award" | "bolt";

export const MILESTONE_ICON_EMOJI: Record<MilestoneIcon, string> = {
  puzzle: "🧩", flame: "🔥", trophy: "🏆", medal: "🥇",
  zap: "⚡",   crown: "👑", target: "🎯", award: "🏅", bolt: "⚡",
};

/**
 * Unified milestone shape returned by getAllMilestones().
 * New page consumes the new fields (`name`, `unlockCopy`, `progressLabel`,
 * `progressRatio`, `tab`); legacy consumers read `label`, `icon`, `emoji`,
 * `current`, `target`, `progressText`. Both populated for every result.
 */
export interface MilestoneResult {
  id: string;
  tab: MilestoneTab;
  name: string;
  description: string;
  unlockCopy: string;
  state: MilestoneState;
  /** 0–1 completion ratio for trackable milestones; 0 for moment-based */
  progressRatio: number;
  /** e.g. "4 of 5 puzzles sent" — null for moment-based milestones */
  progressLabel: string | null;
  /** True for the single most-progressed unachieved milestone per tab */
  isNext: boolean;

  // ── Legacy compat fields ──
  /** Alias of `name` */
  label: string;
  icon: MilestoneIcon;
  emoji: string;
  /** 0–100 derived from progressRatio (legacy display) */
  current: number;
  /** 100 when progressLabel exists, else 0 (legacy display) */
  target: number;
  /** Alias of progressLabel ("" when null) */
  progressText: string;
  /** Optional motivational quote — alias of unlockCopy for share cards */
  quote?: string;
}

/** Legacy alias kept so old imports don't break. */
export type MilestoneWithProgress = MilestoneResult;

// ── localStorage keys ─────────────────────────────────────────────────────────

const SHOWN_KEY       = "puzzlecraft-milestones-shown";
const CELEBRATED_KEY  = "puzzlecraft-milestones-celebrated";
const PEAK_RATING_KEY = "puzzlecraft-peak-rating";
const BACKFILL_KEY    = "puzzlecraft-milestones-backfilled-v1";

export const FLAG_FIRST_RECIPIENT_SOLVE = "puzzlecraft-flag-recipient-solve";
export const FLAG_BEAT_CHALLENGE_TIME   = "puzzlecraft-flag-beat-challenge";

// ── Persistence helpers ───────────────────────────────────────────────────────

function getShownIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SHOWN_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function markShown(id: string) {
  const shown = getShownIds();
  shown.add(id);
  try { localStorage.setItem(SHOWN_KEY, JSON.stringify([...shown])); } catch {}
}

export function getUncelebratedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(CELEBRATED_KEY);
    const celebrated = raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
    const shown = getShownIds();
    const out = new Set<string>();
    for (const id of shown) if (!celebrated.has(id)) out.add(id);
    return out;
  } catch { return new Set(); }
}

export function markCelebrated(ids: string[]) {
  try {
    const raw = localStorage.getItem(CELEBRATED_KEY);
    const celebrated: Set<string> = raw ? new Set(JSON.parse(raw)) : new Set();
    for (const id of ids) celebrated.add(id);
    localStorage.setItem(CELEBRATED_KEY, JSON.stringify([...celebrated]));
  } catch {}
}

function getPeakRating(): number {
  try { return parseInt(localStorage.getItem(PEAK_RATING_KEY) ?? "0", 10) || 0; }
  catch { return 0; }
}

function updatePeakRating(current: number): boolean {
  const prev = getPeakRating();
  if (current > prev) {
    try { localStorage.setItem(PEAK_RATING_KEY, String(current)); } catch {}
    return true;
  }
  return false;
}

function getFlag(key: string): boolean {
  try { return localStorage.getItem(key) === "1"; } catch { return false; }
}

export function setFlag(key: string) {
  try { localStorage.setItem(key, "1"); } catch {}
}

// ── Convenience exports ───────────────────────────────────────────────────────

export function recordFirstRecipientSolve() {
  setFlag(FLAG_FIRST_RECIPIENT_SOLVE);
  checkMilestones();
}

export function recordBeatChallengeTime() {
  setFlag(FLAG_BEAT_CHALLENGE_TIME);
  checkMilestones();
}

// ── Snapshot ──────────────────────────────────────────────────────────────────

const ALL_TYPES: PuzzleCategory[] = [
  "crossword", "word-fill", "number-fill", "sudoku",
  "word-search", "kakuro", "nonogram", "cryptogram",
];

const TIER_ORDER: SkillTier[] = ["Beginner", "Casual", "Skilled", "Advanced", "Expert"];
const TIER_THRESHOLDS: Record<string, number> = {
  Skilled: 850, Advanced: 1300, Expert: 1650,
};

interface Snapshot {
  solveCount: number;
  typesPlayed: Set<PuzzleCategory>;
  hasCleanSheet: boolean;
  streakCurrent: number;
  rating: number;
  tierIdx: number;
  isPeakRating: boolean;
  sentCount: number;
  receivedCompleted: boolean;
  firstRecipientSolve: boolean;
  beatChallengeTime: boolean;
}

/**
 * Override data source for milestones. When provided, snapshot() uses these
 * values instead of reading localStorage — used by View-As mode and QA Preview
 * mode to ensure milestones reflect the target user (not the admin).
 */
export interface MilestoneDataSource {
  solves?: SolveRecord[];
  currentStreak?: number;
  sentCount?: number;
  receivedCompleted?: boolean;
  /** When true, suppress flag-based achievements (recipient solve / beat challenge) */
  suppressLocalFlags?: boolean;
}

function snapshot(src?: MilestoneDataSource): Snapshot {
  const usingOverride = !!src;
  const baseRecords   = src?.solves ?? getSolveRecords();
  const records       = baseRecords.filter((r) => r.solveTime >= 10);
  const solveCount    = records.length;
  const typesPlayed   = new Set(records.map((r) => r.puzzleType));
  const hasCleanSheet = records.some((r) => r.hintsUsed === 0 && r.mistakesCount === 0);

  let streakCurrent = 0;
  if (usingOverride) {
    streakCurrent = src?.currentStreak ?? 0;
  } else {
    try { streakCurrent = getProgressStats().currentStreak; } catch {}
  }

  const rating  = solveCount >= 5 ? computePlayerRating(records) : 0;
  const tier    = getSkillTier(rating, solveCount);
  const tierIdx = TIER_ORDER.indexOf(tier);

  // Peak rating tracking only for the real local user — never for overrides
  const isPeakRating = !usingOverride && rating > 0 ? updatePeakRating(rating) : false;

  let sentCount = 0;
  let receivedCompleted = false;
  if (usingOverride) {
    sentCount         = src?.sentCount ?? 0;
    receivedCompleted = src?.receivedCompleted ?? false;
  } else {
    try { sentCount = loadSentItems().length; } catch {}
    try { receivedCompleted = loadReceivedItems().some((r) => r.status === "completed"); } catch {}
  }

  const suppressFlags       = usingOverride && (src?.suppressLocalFlags ?? false);
  const firstRecipientSolve = suppressFlags ? false : getFlag(FLAG_FIRST_RECIPIENT_SOLVE);
  const beatChallengeTime   = suppressFlags ? false : getFlag(FLAG_BEAT_CHALLENGE_TIME);

  return {
    solveCount, typesPlayed, hasCleanSheet, streakCurrent,
    rating, tierIdx, isPeakRating,
    sentCount, receivedCompleted, firstRecipientSolve, beatChallengeTime,
  };
}

// ── Milestone specifications ──────────────────────────────────────────────────

interface MilestoneSpec {
  id: string;
  tab: MilestoneTab;
  name: string;
  description: string;
  unlockCopy: string;
  /** Legacy icon for share cards / modal */
  icon: MilestoneIcon;
  check: (s: Snapshot) => boolean;
  progress?: (s: Snapshot) => { ratio: number; label: string };
}

const SPECS: MilestoneSpec[] = [
  // ── RANKED ──
  {
    id: "off-the-bench",
    tab: "ranked",
    name: "Off the Bench",
    description: "Your first rating unlock",
    unlockCopy: "You're in the system. Now let's see how high you go.",
    icon: "zap",
    check: (s) => s.solveCount >= 10,
    progress: (s) => ({
      ratio: Math.min(s.solveCount / 10, 1),
      label: `${Math.min(s.solveCount, 10)} of 10 solves`,
    }),
  },
  {
    id: "tier-skilled",
    tab: "ranked",
    name: "Skilled",
    description: "Climb into the Skilled tier",
    unlockCopy: "Comfortable with the hard stuff. That's what Skilled means.",
    icon: "target",
    check: (s) => s.tierIdx >= TIER_ORDER.indexOf("Skilled"),
    progress: (s) => ({
      ratio: Math.min(s.rating / TIER_THRESHOLDS.Skilled, 1),
      label: `${s.rating} of ${TIER_THRESHOLDS.Skilled} rating`,
    }),
  },
  {
    id: "tier-advanced",
    tab: "ranked",
    name: "Advanced",
    description: "Climb into the Advanced tier",
    unlockCopy: "You're not just solving — you're excelling.",
    icon: "award",
    check: (s) => s.tierIdx >= TIER_ORDER.indexOf("Advanced"),
    progress: (s) => ({
      ratio: Math.min(s.rating / TIER_THRESHOLDS.Advanced, 1),
      label: `${s.rating} of ${TIER_THRESHOLDS.Advanced} rating`,
    }),
  },
  {
    id: "tier-expert",
    tab: "ranked",
    name: "Expert",
    description: "Reach the top of the board",
    unlockCopy: "Elite. There's no higher rank.",
    icon: "trophy",
    check: (s) => s.tierIdx >= TIER_ORDER.indexOf("Expert"),
    progress: (s) => ({
      ratio: Math.min(s.rating / TIER_THRESHOLDS.Expert, 1),
      label: `${s.rating} of ${TIER_THRESHOLDS.Expert} rating`,
    }),
  },

  // ── SOLVER ──
  {
    id: "first-crack",
    tab: "solver",
    name: "First Crack",
    description: "Solve your very first puzzle",
    unlockCopy: "You're a Puzzlecraft solver now.",
    icon: "puzzle",
    check: (s) => s.solveCount >= 1,
  },
  {
    id: "on-a-roll",
    tab: "solver",
    name: "On a Roll",
    description: "Build your first streak",
    unlockCopy: "Three days in a row. That's a habit starting.",
    icon: "flame",
    check: (s) => s.streakCurrent >= 3,
    progress: (s) => ({
      ratio: Math.min(s.streakCurrent / 3, 1),
      label: `${Math.min(s.streakCurrent, 3)} of 3 days`,
    }),
  },
  {
    id: "clean-sheet",
    tab: "solver",
    name: "Clean Sheet",
    description: "Solve with no hints, no mistakes",
    unlockCopy: "No hints. No mistakes. That's you.",
    icon: "medal",
    check: (s) => s.hasCleanSheet,
  },
  {
    id: "the-long-game",
    tab: "solver",
    name: "The Long Game",
    description: "Play every one of the 8 puzzle types",
    unlockCopy: "All 8 types. You've seen everything this game has.",
    icon: "target",
    check: (s) => ALL_TYPES.every((t) => s.typesPlayed.has(t)),
    progress: (s) => {
      const done = ALL_TYPES.filter((t) => s.typesPlayed.has(t)).length;
      return { ratio: done / 8, label: `${done} of 8 types played` };
    },
  },
  {
    id: "iron-habit",
    tab: "solver",
    name: "Iron Habit",
    description: "Hold a 30-day solve streak",
    unlockCopy: "30 days. That's not luck — that's character.",
    icon: "crown",
    check: (s) => s.streakCurrent >= 30,
    progress: (s) => ({
      ratio: Math.min(s.streakCurrent / 30, 1),
      label: `${Math.min(s.streakCurrent, 30)} of 30 days`,
    }),
  },

  // ── CRAFTER ──
  {
    id: "made-something",
    tab: "crafter",
    name: "Made Something",
    description: "Send your first crafted puzzle",
    unlockCopy: "You're a crafter now. Someone's about to get this.",
    icon: "puzzle",
    check: (s) => s.sentCount >= 1,
  },
  {
    id: "they-solved-it",
    tab: "crafter",
    name: "They Solved It",
    description: "Get a recipient to finish your puzzle",
    unlockCopy: "They finished it. The loop is complete.",
    icon: "trophy",
    check: (s) => s.firstRecipientSolve,
  },
  {
    id: "puzzle-maker",
    tab: "crafter",
    name: "Puzzle Maker",
    description: "Create and send 5 puzzles",
    unlockCopy: "Five people got a puzzle from you. That's a thing you do now.",
    icon: "award",
    check: (s) => s.sentCount >= 5,
    progress: (s) => ({
      ratio: Math.min(s.sentCount / 5, 1),
      label: `${Math.min(s.sentCount, 5)} of 5 puzzles sent`,
    }),
  },

  // ── SOCIAL ──
  {
    id: "challenge-accepted",
    tab: "social",
    name: "Challenge Accepted",
    description: "Solve a puzzle made for you",
    unlockCopy: "They made it. You solved it. That's how this works.",
    icon: "bolt",
    check: (s) => s.receivedCompleted,
  },
  {
    id: "game-on",
    tab: "social",
    name: "Game On",
    description: "Beat a creator's challenge time",
    unlockCopy: "You beat their time. Now they know.",
    icon: "zap",
    check: (s) => s.beatChallengeTime,
  },
];

// ── Backfill ──────────────────────────────────────────────────────────────────

/**
 * One-time silent backfill for existing users. Marks every currently-achieved
 * milestone as already shown + celebrated, so the milestones UI reflects the
 * user's full solve history WITHOUT firing a wall of "new milestone!" toasts
 * or "new" dot indicators on first load. Idempotent — runs once per device.
 */
function backfillIfNeeded(s: Snapshot): void {
  try {
    if (localStorage.getItem(BACKFILL_KEY) === "1") return;
    const achievedIds = SPECS.filter((spec) => spec.check(s)).map((spec) => spec.id);
    if (achievedIds.length > 0) {
      const shown = getShownIds();
      for (const id of achievedIds) shown.add(id);
      localStorage.setItem(SHOWN_KEY, JSON.stringify([...shown]));
      markCelebrated(achievedIds);
    }
    localStorage.setItem(BACKFILL_KEY, "1");
  } catch {}
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getAllMilestones(src?: MilestoneDataSource): MilestoneResult[] {
  const s = snapshot(src);
  if (!src) backfillIfNeeded(s);

  const results: MilestoneResult[] = SPECS.map((spec) => {
    const achieved = spec.check(s);
    const prog     = spec.progress ? spec.progress(s) : null;

    let state: MilestoneState;
    if (achieved) state = "achieved";
    else if (prog && prog.ratio >= 0.25) state = "in-progress";
    else state = "locked";

    const ratio = achieved ? 1 : (prog?.ratio ?? 0);
    const label = prog?.label ?? null;

    return {
      id:            spec.id,
      tab:           spec.tab,
      name:          spec.name,
      description:   spec.description,
      unlockCopy:    spec.unlockCopy,
      state,
      progressRatio: ratio,
      progressLabel: label,
      isNext:        false,

      // legacy compat
      label:        spec.name,
      icon:         spec.icon,
      emoji:        MILESTONE_ICON_EMOJI[spec.icon],
      current:      Math.round(ratio * 100),
      target:       label ? 100 : 0,
      progressText: label ?? "",
      quote:        spec.unlockCopy,
    };
  });

  // One isNext per tab — prefer in-progress, then highest ratio
  const tabs: MilestoneTab[] = ["ranked", "solver", "crafter", "social"];
  for (const tab of tabs) {
    const unachieved = results.filter((r) => r.tab === tab && r.state !== "achieved");
    if (!unachieved.length) continue;
    const best = unachieved.reduce((a, b) => {
      const scoreA = (a.state === "in-progress" ? 100 : 0) + a.progressRatio * 10;
      const scoreB = (b.state === "in-progress" ? 100 : 0) + b.progressRatio * 10;
      return scoreB > scoreA ? b : a;
    });
    best.isNext = true;
  }

  return results;
}

export function getMilestonesForTab(tab: MilestoneTab, src?: MilestoneDataSource): MilestoneResult[] {
  return getAllMilestones(src).filter((m) => m.tab === tab);
}

// ── checkMilestones ───────────────────────────────────────────────────────────

/**
 * Checks all milestones; fires a sonner toast for each newly achieved one.
 * Identity-forward: name on line 1, unlockCopy on line 2. Staggered 1.5s apart.
 */
export function checkMilestones(): number {
  const s     = snapshot();
  const shown = getShownIds();
  const newly = SPECS.filter((spec) => !shown.has(spec.id) && spec.check(s));

  newly.forEach((spec, i) => {
    setTimeout(() => {
      markShown(spec.id);
      toast.success(spec.name, {
        description: spec.unlockCopy,
        duration:    4500,
        id:          `milestone-${spec.id}`,
      });
    }, i * 1500);
  });

  return newly.length;
}
