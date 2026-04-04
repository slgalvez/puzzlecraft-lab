/**
 * usePersonalInsights.ts
 * src/hooks/usePersonalInsights.ts
 *
 * Derives 1–3 dynamic insight strings from local solve history.
 * Used by InsightsBanner on the Play tab and Stats page.
 *
 * Reads from getSolveRecords() — no API call needed.
 * Returns null if there's not enough data to generate meaningful insights.
 */

import { useMemo } from "react";
import { getSolveRecords } from "@/lib/solveTracker";
import { CATEGORY_INFO, type PuzzleCategory } from "@/lib/puzzleTypes";
import { getDailyStreak } from "@/lib/dailyChallenge";
import { formatTime } from "@/hooks/usePuzzleTimer";

export interface Insight {
  id: string;
  type: "performance" | "streak" | "improvement" | "style" | "nudge";
  icon: "trending-up" | "flame" | "zap" | "target" | "clock";
  text: string;
  /** If true, shown with amber/warning styling (streak at risk etc.) */
  urgent?: boolean;
}

function getWeekMs(weeksAgo: number) {
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  return { start: now - (weeksAgo + 1) * weekMs, end: now - weeksAgo * weekMs };
}

export function usePersonalInsights(): Insight[] {
  return useMemo(() => {
    const records = getSolveRecords().filter((r) => r.solveTime >= 10 && !r.assisted);
    if (records.length < 5) return []; // not enough data

    const insights: Insight[] = [];
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;

    // ── Streak at risk ───────────────────────────────────────────────────────
    const streak = getDailyStreak();
    const todayStr = new Date().toISOString().slice(0, 10);
    const lastSolveDate = records[0]?.puzzleId?.startsWith("daily-")
      ? records.find((r) => r.puzzleId?.startsWith("daily-"))?.puzzleId?.split("daily-")[1]?.slice(0, 10)
      : null;
    const hasPlayedToday = lastSolveDate === todayStr;

    if (streak.current >= 3 && !hasPlayedToday) {
      insights.push({
        id: "streak-risk",
        type: "nudge",
        icon: "flame",
        text: `Your ${streak.current}-day streak is at risk — play today to keep it going`,
        urgent: true,
      });
    }

    // ── Week-over-week improvement ────────────────────────────────────────────
    const thisWeek = getWeekMs(0);
    const lastWeek = getWeekMs(1);
    const thisWeekRecords = records.filter((r) => {
      const ts = new Date(r.completedAt).getTime();
      return ts >= thisWeek.start;
    });
    const lastWeekRecords = records.filter((r) => {
      const ts = new Date(r.completedAt).getTime();
      return ts >= lastWeek.start && ts < lastWeek.end;
    });

    if (thisWeekRecords.length >= 3 && lastWeekRecords.length >= 3) {
      const thisAvg = thisWeekRecords.reduce((s, r) => s + r.solveTime, 0) / thisWeekRecords.length;
      const lastAvg = lastWeekRecords.reduce((s, r) => s + r.solveTime, 0) / lastWeekRecords.length;
      const pctChange = ((lastAvg - thisAvg) / lastAvg) * 100;

      if (pctChange > 10) {
        insights.push({
          id: "improvement",
          type: "improvement",
          icon: "trending-up",
          text: `You've improved your average solve time by ${Math.round(pctChange)}% this week`,
        });
      } else if (pctChange < -15) {
        insights.push({
          id: "regression",
          type: "improvement",
          icon: "clock",
          text: `Your times are a bit slower this week — try an easier difficulty to warm up`,
        });
      }
    }

    // ── Best puzzle type (compared to average) ────────────────────────────────
    const byType: Record<string, number[]> = {};
    for (const r of records) {
      if (!byType[r.puzzleType]) byType[r.puzzleType] = [];
      byType[r.puzzleType].push(r.solveTime);
    }

    // Need at least 2 types with 3+ solves each to make a meaningful comparison
    const typesWithData = Object.entries(byType).filter(([, times]) => times.length >= 3);
    if (typesWithData.length >= 2) {
      const typeAvgs = typesWithData.map(([type, times]) => ({
        type: type as PuzzleCategory,
        avg: times.reduce((a, b) => a + b, 0) / times.length,
        count: times.length,
      }));

      const mostPlayed = typeAvgs.sort((a, b) => b.count - a.count)[0];
      if (mostPlayed && mostPlayed.count >= 5) {
        const typeName = CATEGORY_INFO[mostPlayed.type]?.name ?? mostPlayed.type;
        insights.push({
          id: "fave-type",
          type: "style",
          icon: "target",
          text: `${typeName} is your most-played puzzle — ${mostPlayed.count} solves`,
        });
      }

      const fastest = typeAvgs.sort((a, b) => a.avg - b.avg)[0];
      const slowest = typeAvgs.sort((a, b) => b.avg - a.avg)[0];
      if (fastest && slowest && fastest.type !== slowest.type) {
        const fastName = CATEGORY_INFO[fastest.type]?.name ?? fastest.type;
        const ratio = Math.round((1 - fastest.avg / slowest.avg) * 100);
        if (ratio > 20) {
          insights.push({
            id: "speed-type",
            type: "performance",
            icon: "zap",
            text: `You solve ${fastName} ${ratio}% faster than any other puzzle type`,
          });
        }
      }
    }

    // ── Personal best celebration ─────────────────────────────────────────────
    const latest = records[0];
    if (latest && records.length >= 5) {
      const sameTypeDiff = records.filter(
        (r) => r.puzzleType === latest.puzzleType && r.difficulty === latest.difficulty
      );
      if (sameTypeDiff.length >= 3) {
        const sorted = [...sameTypeDiff].sort((a, b) => a.solveTime - b.solveTime);
        if (sorted[0].puzzleId === latest.puzzleId || sorted[0].solveTime === latest.solveTime) {
          const typeName = CATEGORY_INFO[latest.puzzleType as PuzzleCategory]?.name ?? latest.puzzleType;
          insights.push({
            id: "personal-best",
            type: "performance",
            icon: "zap",
            text: `New personal best in ${typeName} ${latest.difficulty}: ${formatTime(latest.solveTime)}`,
          });
        }
      }
    }

    // Return max 3, prioritise urgent ones first
    const sorted = [...insights].sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0));
    return sorted.slice(0, 3);
  }, []);
}
