/**
 * Data-driven insight engine for Puzzlecraft+ stats.
 * Generates exactly ONE best insight sentence from real solve data.
 */
import type { SolveRecord } from "./solveTracker";
import type { PuzzleCategory } from "./puzzleTypes";
import { CATEGORY_INFO } from "./puzzleTypes";
import { computeSolveScore, trueMistakes } from "./solveScoring";

interface Insight {
  text: string;
  priority: number; // higher = more interesting
}

/**
 * Returns the single best data-driven insight from recent solves,
 * or a neutral fallback if data is insufficient.
 */
export function getBestInsight(records: SolveRecord[]): string {
  const valid = records.filter((r) => r.solveTime >= 10);
  if (valid.length < 3) return "Solve more puzzles to unlock insights.";

  const candidates: Insight[] = [];

  // 1. No-hint rate
  const noHintCount = valid.filter((r) => r.hintsUsed === 0).length;
  const noHintRate = noHintCount / valid.length;
  if (noHintRate >= 0.9 && valid.length >= 5) {
    candidates.push({ text: "You solve without hints almost every time — impressive discipline.", priority: 8 });
  } else if (noHintRate >= 0.7 && valid.length >= 5) {
    candidates.push({ text: `${Math.round(noHintRate * 100)}% of your solves are hint-free.`, priority: 5 });
  }

  // 2. Accuracy
  const avgMistakes = valid.reduce((s, r) => s + trueMistakes(r), 0) / valid.length;
  if (avgMistakes < 0.5 && valid.length >= 5) {
    candidates.push({ text: "Your accuracy is exceptional — fewer than 1 mistake on average.", priority: 9 });
  } else if (avgMistakes < 1.5) {
    candidates.push({ text: "Your accuracy is solid with minimal errors per puzzle.", priority: 4 });
  }

  // 3. Speed improvement (recent half vs older half)
  if (valid.length >= 8) {
    const half = Math.floor(valid.length / 2);
    const recentAvgTime = valid.slice(0, half).reduce((s, r) => s + r.solveTime, 0) / half;
    const olderAvgTime = valid.slice(half).reduce((s, r) => s + r.solveTime, 0) / (valid.length - half);
    const speedUp = (olderAvgTime - recentAvgTime) / olderAvgTime;
    if (speedUp > 0.15) {
      candidates.push({ text: `You're solving ${Math.round(speedUp * 100)}% faster than your earlier pace.`, priority: 10 });
    } else if (speedUp > 0.05) {
      candidates.push({ text: "Your solve speed is trending upward.", priority: 6 });
    }
  }

  // 4. Difficulty progression
  const hardSolves = valid.filter((r) => r.difficulty === "hard" || r.difficulty === "extreme" || r.difficulty === "insane");
  if (hardSolves.length >= 3) {
    const recentHard = valid.slice(0, Math.min(10, valid.length)).filter(
      (r) => r.difficulty === "hard" || r.difficulty === "extreme" || r.difficulty === "insane"
    ).length;
    if (recentHard >= 5) {
      candidates.push({ text: "You've been consistently tackling harder difficulties recently.", priority: 7 });
    }
  }

  // 5. Strongest puzzle type
  const byType: Record<string, { total: number; count: number }> = {};
  for (const r of valid) {
    if (!byType[r.puzzleType]) byType[r.puzzleType] = { total: 0, count: 0 };
    byType[r.puzzleType].total += computeSolveScore(r);
    byType[r.puzzleType].count++;
  }
  const types = Object.entries(byType).filter(([, v]) => v.count >= 3);
  if (types.length >= 2) {
    types.sort((a, b) => (b[1].total / b[1].count) - (a[1].total / a[1].count));
    const best = types[0];
    const name = CATEGORY_INFO[best[0] as PuzzleCategory]?.name ?? best[0];
    candidates.push({ text: `${name} is your strongest puzzle type by score.`, priority: 6 });
  }

  // 6. Score trend (recent vs older)
  if (valid.length >= 8) {
    const half = Math.floor(valid.length / 2);
    const recentAvgScore = valid.slice(0, half).reduce((s, r) => s + computeSolveScore(r), 0) / half;
    const olderAvgScore = valid.slice(half).reduce((s, r) => s + computeSolveScore(r), 0) / (valid.length - half);
    if (recentAvgScore < olderAvgScore * 0.85) {
      candidates.push({ text: "Your recent scores have dipped — a tougher stretch or new puzzle types?", priority: 7 });
    }
  }

  if (candidates.length === 0) {
    return "Keep solving to build a clearer picture of your performance.";
  }

  candidates.sort((a, b) => b.priority - a.priority);
  return candidates[0].text;
}
