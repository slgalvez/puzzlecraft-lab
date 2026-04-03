/**
 * MilestoneShareCard.tsx
 * Generates a shareable image card when a user hits a milestone.
 */

import { useCallback, useRef, useState } from "react";
import { hapticSuccess } from "@/lib/haptic";

interface Milestone {
  id: string;
  label: string;
  description: string;
  icon: string;
  rarity?: "common" | "rare" | "legendary";
}

const CARD_WIDTH  = 1080;
const CARD_HEIGHT = 600;

function rarityColor(rarity?: string): string {
  switch (rarity) {
    case "legendary": return "#a855f7";
    case "rare":      return "#f97316";
    default:          return "#3b82f6";
  }
}

async function renderMilestoneCard(
  milestone: Milestone,
  streakDays: number,
  canvas: HTMLCanvasElement
): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width  = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;

  const accent = rarityColor(milestone.rarity);

  ctx.fillStyle = "#0f0f0f";
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, CARD_WIDTH, 6);
  ctx.fillRect(0, CARD_HEIGHT - 6, CARD_WIDTH, 6);

  const glow = ctx.createRadialGradient(0, CARD_HEIGHT / 2, 0, 0, CARD_HEIGHT / 2, 600);
  glow.addColorStop(0, accent + "22");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  ctx.font = "bold 36px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillStyle = "#ffffff66";
  ctx.textAlign = "left";
  ctx.fillText("PUZZLECRAFT", 60, 60);

  ctx.font = "160px serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(milestone.icon, CARD_WIDTH / 2, 280);

  ctx.font = "bold 72px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText(milestone.label, CARD_WIDTH / 2, 380);

  const rarityLabel = (milestone.rarity ?? "common").toUpperCase();
  ctx.font = "bold 28px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillStyle = accent;
  ctx.fillText(rarityLabel + " ACHIEVEMENT", CARD_WIDTH / 2, 430);

  ctx.font = "32px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillStyle = "#ffffff99";
  ctx.fillText(milestone.description, CARD_WIDTH / 2, 490);

  if (streakDays > 0) {
    ctx.font = "bold 28px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillStyle = "#f97316";
    ctx.textAlign = "right";
    ctx.fillText(`🔥 ${streakDays} day streak`, CARD_WIDTH - 60, CARD_HEIGHT - 28);
  }
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
