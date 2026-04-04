/**
 * useSolveShareCard.ts  ← CREATE NEW FILE
 * src/hooks/useSolveShareCard.ts
 *
 * Generates a 1080×540 PNG share card when a puzzle is solved.
 * Shares via Web Share API (→ iOS share sheet via Capacitor).
 * Falls back to text-only share if canvas/share API unavailable.
 *
 * Used inside CompletionPanel — replaces the text-only share.
 */

import { useCallback, useState } from "react";
import type { PuzzleCategory } from "@/lib/puzzleTypes";
import type { Difficulty } from "@/lib/puzzleTypes";
import { CATEGORY_INFO, DIFFICULTY_LABELS } from "@/lib/puzzleTypes";
import { formatTime } from "@/hooks/usePuzzleTimer";
import { hapticSuccess } from "@/lib/haptic";

// ── Card dimensions ────────────────────────────────────────────────────────
const W = 1080;
const H = 540;

// Puzzlecraft orange (matches --primary: 32 80% 50%)
const ORANGE = "#E07A10";
const ORANGE_DIM = "#7a4208";
const BG = "#0f0e0d";
const TEXT_PRIMARY = "#f5efe8";
const TEXT_MUTED = "#8a7a6a";

// ── Canvas renderer ────────────────────────────────────────────────────────

interface CardData {
  puzzleType?: PuzzleCategory;
  difficulty: Difficulty;
  time: number;
  isNewBest: boolean;
  streakDays: number;
  isDaily: boolean;
  shareUrl?: string;
}

async function renderCard(data: CardData): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const { puzzleType, difficulty, time, isNewBest, streakDays, isDaily, shareUrl } = data;

  const typeName = puzzleType ? (CATEGORY_INFO[puzzleType]?.name ?? puzzleType) : "Puzzle";
  const diffLabel = DIFFICULTY_LABELS[difficulty];
  const timeStr = formatTime(time);

  // ── Background ──
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // ── Top accent bar ──
  ctx.fillStyle = ORANGE;
  ctx.fillRect(0, 0, W, 5);

  // ── Subtle grid pattern ──
  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // ── Brand ──
  ctx.font = "bold 28px -apple-system, 'SF Pro Display', 'DM Sans', sans-serif";
  ctx.fillStyle = ORANGE;
  ctx.letterSpacing = "0.15em";
  ctx.fillText("PUZZLECRAFT", 60, 68);
  ctx.letterSpacing = "0em";

  // ── Puzzle type + difficulty badge ──
  const badgeText = `${typeName.toUpperCase()} · ${diffLabel.toUpperCase()}${isDaily ? " · DAILY" : ""}`;
  ctx.font = "500 22px -apple-system, 'SF Pro Display', 'DM Sans', sans-serif";
  ctx.fillStyle = TEXT_MUTED;
  ctx.fillText(badgeText, 60, 110);

  // ── New best banner ──
  if (isNewBest) {
    ctx.fillStyle = "rgba(255, 175, 50, 0.12)";
    ctx.beginPath();
    ctx.roundRect(60, 135, 320, 48, 8);
    ctx.fill();
    ctx.font = "bold 22px -apple-system, 'SF Pro Display', 'DM Sans', sans-serif";
    ctx.fillStyle = "#ffaa33";
    ctx.fillText("🏆  NEW PERSONAL BEST", 80, 165);
  }

  // ── Big time ──
  const timeY = isNewBest ? 295 : 270;
  ctx.font = `bold 120px 'SF Mono', 'Fira Code', monospace`;
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.fillText(timeStr, 60, timeY);

  // ── "Time" label ──
  ctx.font = "500 22px -apple-system, 'SF Pro Display', 'DM Sans', sans-serif";
  ctx.fillStyle = TEXT_MUTED;
  ctx.fillText("TIME", 60, timeY + 36);

  // ── Streak ──
  if (streakDays > 0) {
    const sx = W - 280;
    const sy = timeY - 80;

    ctx.fillStyle = "rgba(224, 122, 16, 0.15)";
    ctx.beginPath();
    ctx.roundRect(sx, sy, 220, 110, 12);
    ctx.fill();

    ctx.font = `bold 64px -apple-system, 'SF Pro Display', 'DM Sans', sans-serif`;
    ctx.fillStyle = ORANGE;
    ctx.textAlign = "center";
    ctx.fillText(String(streakDays), sx + 110, sy + 72);

    ctx.font = "500 18px -apple-system, 'SF Pro Display', 'DM Sans', sans-serif";
    ctx.fillStyle = TEXT_MUTED;
    ctx.fillText("DAY STREAK 🔥", sx + 110, sy + 100);
    ctx.textAlign = "left";
  }

  // ── CTA line ──
  ctx.font = "500 20px -apple-system, 'SF Pro Display', 'DM Sans', sans-serif";
  ctx.fillStyle = TEXT_MUTED;
  const cta = shareUrl ? `Can you beat this? ${shareUrl}` : "Can you beat this? puzzlecraft.com";
  ctx.fillText(cta, 60, H - 40);

  // ── Bottom accent bar ──
  ctx.fillStyle = ORANGE_DIM;
  ctx.fillRect(0, H - 5, W, 5);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

// ── Hook ──────────────────────────────────────────────────────────────────

export interface UseSolveShareCardReturn {
  shareWithCard: (textFallback: string) => Promise<void>;
  sharing: boolean;
}

export function useSolveShareCard(cardData: CardData): UseSolveShareCardReturn {
  const [sharing, setSharing] = useState(false);

  const shareWithCard = useCallback(async (textFallback: string) => {
    setSharing(true);
    try {
      // Try image share first
      const blob = await renderCard(cardData);
      if (blob) {
        const file = new File([blob], "puzzlecraft-solve.png", { type: "image/png" });

        if (navigator.canShare?.({ files: [file] })) {
          hapticSuccess();
          await navigator.share({
            files: [file],
            text: textFallback,
          });
          return;
        }
      }

      // Fallback: text-only share
      if (navigator.share) {
        await navigator.share({ text: textFallback });
      } else {
        await navigator.clipboard.writeText(textFallback);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        // Final fallback: clipboard
        try { await navigator.clipboard.writeText(textFallback); } catch {}
      }
    } finally {
      setSharing(false);
    }
  }, [cardData]);

  return { shareWithCard, sharing };
}
