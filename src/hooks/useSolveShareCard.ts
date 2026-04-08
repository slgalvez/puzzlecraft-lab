/**
 * useSolveShareCard.ts
 * src/hooks/useSolveShareCard.ts
 *
 * Generates a premium 1080×1080 PNG share card when a puzzle is solved.
 * Center-weighted layout optimized for iMessage preview cropping.
 * Shares via Web Share API (→ iOS share sheet via Capacitor).
 * Falls back to text-only share if canvas/share API unavailable.
 */

import { useCallback, useState } from "react";
import type { PuzzleCategory } from "@/lib/puzzleTypes";
import type { Difficulty } from "@/lib/puzzleTypes";
import { CATEGORY_INFO, DIFFICULTY_LABELS } from "@/lib/puzzleTypes";
import { formatTime } from "@/hooks/usePuzzleTimer";
import { hapticSuccess } from "@/lib/haptic";

// ── Card dimensions (square for best social/iMessage preview) ──────────
const W = 1080;
const H = 1080;

// ── Premium palette ────────────────────────────────────────────────────
const ORANGE       = "#F97316";
const ORANGE_SOFT  = "rgba(249, 115, 22, 0.12)";
const ORANGE_GLOW  = "rgba(249, 115, 22, 0.06)";
const BG_TOP       = "#141210";
const BG_BOTTOM    = "#0c0b09";
const TEXT_PRIMARY  = "#f5f0e8";
const TEXT_SECONDARY = "#a89a88";
const TEXT_DIM      = "#6b5f52";
const DIVIDER       = "rgba(249, 115, 22, 0.15)";

// ── Fonts ──────────────────────────────────────────────────────────────
const FONT_SANS = "-apple-system, 'SF Pro Display', 'Inter', system-ui, sans-serif";
const FONT_MONO = "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace";

// ── Canvas renderer ────────────────────────────────────────────────────

interface CardData {
  puzzleType?: PuzzleCategory;
  difficulty: Difficulty;
  time: number;
  isNewBest: boolean;
  streakDays: number;
  isDaily: boolean;
  shareUrl?: string;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function renderCard(data: CardData): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const { puzzleType, difficulty, time, isNewBest, streakDays, isDaily, shareUrl } = data;

  const typeName = puzzleType ? (CATEGORY_INFO[puzzleType]?.name ?? puzzleType) : "Puzzle";
  const diffLabel = DIFFICULTY_LABELS[difficulty];
  const timeStr = formatTime(time);

  // ── Gradient background ──
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, BG_TOP);
  bgGrad.addColorStop(1, BG_BOTTOM);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ── Subtle center radial glow ──
  const glow = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, 420);
  glow.addColorStop(0, ORANGE_GLOW);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // ── Top accent line ──
  const lineGrad = ctx.createLinearGradient(W * 0.2, 0, W * 0.8, 0);
  lineGrad.addColorStop(0, "transparent");
  lineGrad.addColorStop(0.5, ORANGE);
  lineGrad.addColorStop(1, "transparent");
  ctx.fillStyle = lineGrad;
  ctx.fillRect(0, 0, W, 3);

  // ── Brand mark (top center) ──
  ctx.textAlign = "center";
  ctx.font = `600 24px ${FONT_SANS}`;
  ctx.fillStyle = TEXT_DIM;
  ctx.fillText("PUZZLECRAFT", W / 2, 80);

  // ── Category pill ──
  const pillText = isDaily
    ? `DAILY  ·  ${typeName.toUpperCase()}  ·  ${diffLabel.toUpperCase()}`
    : `${typeName.toUpperCase()}  ·  ${diffLabel.toUpperCase()}`;

  ctx.font = `600 22px ${FONT_SANS}`;
  const pillW = ctx.measureText(pillText).width + 48;
  const pillX = (W - pillW) / 2;
  const pillY = 110;

  ctx.fillStyle = ORANGE_SOFT;
  drawRoundedRect(ctx, pillX, pillY, pillW, 40, 20);
  ctx.fill();

  ctx.fillStyle = ORANGE;
  ctx.font = `600 18px ${FONT_SANS}`;
  ctx.fillText(pillText, W / 2, pillY + 26);

  // ── New best badge ──
  if (isNewBest) {
    ctx.font = `700 20px ${FONT_SANS}`;
    ctx.fillStyle = "#ffb347";
    ctx.fillText("🏆  NEW PERSONAL BEST", W / 2, 210);
  }

  // ── Hero time (center-weighted) ──
  const heroY = isNewBest ? 400 : 380;
  ctx.font = `700 180px ${FONT_MONO}`;
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.fillText(timeStr, W / 2, heroY);

  // ── "SOLVE TIME" label ──
  ctx.font = `500 22px ${FONT_SANS}`;
  ctx.fillStyle = TEXT_DIM;
  ctx.fillText("SOLVE TIME", W / 2, heroY + 50);

  // ── Streak card (if applicable) ──
  if (streakDays > 0) {
    const streakY = heroY + 100;
    const streakW = 260;
    const streakH = 80;
    const streakX = (W - streakW) / 2;

    ctx.fillStyle = ORANGE_SOFT;
    drawRoundedRect(ctx, streakX, streakY, streakW, streakH, 16);
    ctx.fill();

    ctx.font = `700 36px ${FONT_SANS}`;
    ctx.fillStyle = ORANGE;
    ctx.fillText(`🔥 ${streakDays}`, W / 2, streakY + 38);

    ctx.font = `500 16px ${FONT_SANS}`;
    ctx.fillStyle = TEXT_SECONDARY;
    ctx.fillText("DAY STREAK", W / 2, streakY + 64);
  }

  // ── Divider ──
  const divY = H - 160;
  const divGrad = ctx.createLinearGradient(W * 0.25, 0, W * 0.75, 0);
  divGrad.addColorStop(0, "transparent");
  divGrad.addColorStop(0.5, DIVIDER);
  divGrad.addColorStop(1, "transparent");
  ctx.fillStyle = divGrad;
  ctx.fillRect(W * 0.15, divY, W * 0.7, 1);

  // ── CTA ──
  ctx.font = `500 22px ${FONT_SANS}`;
  ctx.fillStyle = TEXT_SECONDARY;
  ctx.fillText("Can you beat this?", W / 2, H - 100);

  ctx.font = `400 18px ${FONT_SANS}`;
  ctx.fillStyle = TEXT_DIM;
  const urlText = shareUrl || "puzzlecrft.com";
  ctx.fillText(urlText, W / 2, H - 65);

  // ── Bottom accent ──
  const bottomGrad = ctx.createLinearGradient(W * 0.2, 0, W * 0.8, 0);
  bottomGrad.addColorStop(0, "transparent");
  bottomGrad.addColorStop(0.5, "rgba(249,115,22,0.4)");
  bottomGrad.addColorStop(1, "transparent");
  ctx.fillStyle = bottomGrad;
  ctx.fillRect(0, H - 3, W, 3);

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
