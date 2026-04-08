/**
 * MilestoneShareCard.tsx
 * Generates a premium shareable image card when a user hits a milestone.
 * Center-weighted 1080×1080 layout optimized for iMessage cropping.
 */

import { useCallback, useRef, useState } from "react";
import { hapticSuccess } from "@/lib/haptic";
import { MILESTONE_ICON_EMOJI, type MilestoneIcon } from "@/lib/milestones";

interface Milestone {
  id: string;
  label: string;
  description: string;
  icon: string;
  rarity?: "common" | "rare" | "legendary";
}

const W = 1080;
const H = 1080;

// ── Premium palette ────────────────────────────────────────────────────
const BG_TOP      = "#141210";
const BG_BOTTOM   = "#0c0b09";
const TEXT_PRIMARY = "#f5f0e8";
const TEXT_SEC     = "#a89a88";
const TEXT_DIM     = "#6b5f52";
const FONT_SANS   = "-apple-system, 'SF Pro Display', 'Inter', system-ui, sans-serif";

function rarityAccent(rarity?: string): string {
  switch (rarity) {
    case "legendary": return "#c084fc"; // purple-400
    case "rare":      return "#fb923c"; // orange-400
    default:          return "#F97316"; // primary orange
  }
}

function rarityLabel(rarity?: string): string {
  switch (rarity) {
    case "legendary": return "LEGENDARY";
    case "rare":      return "RARE";
    default:          return "ACHIEVEMENT";
  }
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

async function renderMilestoneCard(
  milestone: Milestone,
  streakDays: number,
  canvas: HTMLCanvasElement
): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = W;
  canvas.height = H;

  const accent = rarityAccent(milestone.rarity);
  const accentSoft = accent + "1A"; // ~10% opacity
  const accentGlow = accent + "0D"; // ~5% opacity
  const emoji = MILESTONE_ICON_EMOJI[milestone.icon as MilestoneIcon] ?? "🏆";

  // ── Gradient background ──
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, BG_TOP);
  bgGrad.addColorStop(1, BG_BOTTOM);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ── Center radial glow ──
  const glow = ctx.createRadialGradient(W / 2, H * 0.38, 0, W / 2, H * 0.38, 380);
  glow.addColorStop(0, accentGlow);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // ── Top accent line ──
  const lineGrad = ctx.createLinearGradient(W * 0.2, 0, W * 0.8, 0);
  lineGrad.addColorStop(0, "transparent");
  lineGrad.addColorStop(0.5, accent);
  lineGrad.addColorStop(1, "transparent");
  ctx.fillStyle = lineGrad;
  ctx.fillRect(0, 0, W, 3);

  // ── Brand mark ──
  ctx.textAlign = "center";
  ctx.font = `600 24px ${FONT_SANS}`;
  ctx.fillStyle = TEXT_DIM;
  ctx.fillText("PUZZLECRAFT", W / 2, 80);

  // ── Rarity pill ──
  const pillText = rarityLabel(milestone.rarity);
  ctx.font = `700 18px ${FONT_SANS}`;
  const pillW = ctx.measureText(pillText).width + 48;
  const pillX = (W - pillW) / 2;
  const pillY = 110;

  ctx.fillStyle = accentSoft;
  drawRoundedRect(ctx, pillX, pillY, pillW, 38, 19);
  ctx.fill();

  ctx.fillStyle = accent;
  ctx.fillText(pillText, W / 2, pillY + 25);

  // ── Emoji icon (hero) ──
  ctx.font = "180px serif";
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.fillText(emoji, W / 2, 370);

  // ── Achievement label ──
  ctx.font = `700 64px ${FONT_SANS}`;
  ctx.fillStyle = TEXT_PRIMARY;

  // Word-wrap if label is long
  const maxLabelW = W - 160;
  const labelMetrics = ctx.measureText(milestone.label);
  if (labelMetrics.width > maxLabelW) {
    ctx.font = `700 48px ${FONT_SANS}`;
  }
  ctx.fillText(milestone.label, W / 2, 490);

  // ── Description ──
  ctx.font = `400 26px ${FONT_SANS}`;
  ctx.fillStyle = TEXT_SEC;
  // Wrap description if needed
  const words = milestone.description.split(" ");
  let line = "";
  const lines: string[] = [];
  const maxDescW = W - 200;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxDescW && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  const descStartY = 550;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], W / 2, descStartY + i * 38);
  }

  // ── Streak card ──
  if (streakDays > 0) {
    const streakY = 700;
    const streakW = 240;
    const streakH = 76;
    const streakX = (W - streakW) / 2;

    ctx.fillStyle = "rgba(249, 115, 22, 0.12)";
    drawRoundedRect(ctx, streakX, streakY, streakW, streakH, 16);
    ctx.fill();

    ctx.font = `700 34px ${FONT_SANS}`;
    ctx.fillStyle = "#F97316";
    ctx.fillText(`🔥 ${streakDays}`, W / 2, streakY + 36);

    ctx.font = `500 16px ${FONT_SANS}`;
    ctx.fillStyle = TEXT_SEC;
    ctx.fillText("DAY STREAK", W / 2, streakY + 62);
  }

  // ── Divider ──
  const divY = H - 140;
  const divGrad = ctx.createLinearGradient(W * 0.25, 0, W * 0.75, 0);
  divGrad.addColorStop(0, "transparent");
  divGrad.addColorStop(0.5, accent + "30");
  divGrad.addColorStop(1, "transparent");
  ctx.fillStyle = divGrad;
  ctx.fillRect(W * 0.15, divY, W * 0.7, 1);

  // ── Footer ──
  ctx.font = `400 20px ${FONT_SANS}`;
  ctx.fillStyle = TEXT_DIM;
  ctx.fillText("puzzlecrft.com", W / 2, H - 60);

  // ── Bottom accent line ──
  const bottomGrad = ctx.createLinearGradient(W * 0.2, 0, W * 0.8, 0);
  bottomGrad.addColorStop(0, "transparent");
  bottomGrad.addColorStop(0.5, accent + "66");
  bottomGrad.addColorStop(1, "transparent");
  ctx.fillStyle = bottomGrad;
  ctx.fillRect(0, H - 3, W, 3);
}

export function useMilestoneShare(streakDays = 0) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [sharing, setSharing] = useState(false);

  const generateAndShare = useCallback(async (milestone: Milestone) => {
    setSharing(true);
    try {
      const canvas = document.createElement("canvas");
      await renderMilestoneCard(milestone, streakDays, canvas);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!blob) throw new Error("Canvas export failed");

      const file = new File([blob], "puzzlecraft-achievement.png", { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        hapticSuccess();
        await navigator.share({
          title: `I earned "${milestone.label}" on Puzzlecraft!`,
          text: milestone.description,
          files: [file],
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "puzzlecraft-achievement.png";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("[MilestoneShare] Failed:", err);
      }
    } finally {
      setSharing(false);
    }
  }, [streakDays]);

  return { generateAndShare, sharing, canvasRef };
}
