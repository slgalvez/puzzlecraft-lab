import { useEffect, useState, useRef, useMemo } from "react";
import { Trophy, Flame, Target, Medal, Zap, Crown, Award, Star, Puzzle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareButton } from "@/components/ui/ShareButton";
import { cn } from "@/lib/utils";
import { hapticSuccess } from "@/lib/haptic";
import type { MilestoneIcon } from "@/lib/milestones";
import { useMilestoneShare } from "./MilestoneShareCard";
import { getProgressStats } from "@/lib/progressTracker";

// ── Icon map — matches MilestoneIcon union in milestones.ts ───────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_MAP: Record<MilestoneIcon, any> = {
  puzzle:  Puzzle,
  flame:   Flame,
  trophy:  Trophy,
  medal:   Medal,
  zap:     Zap,
  crown:   Crown,
  target:  Target,
  award:   Award,
  bolt:    Zap,   // Bolt isn't in lucide-react — fallback to Zap
};

// ── Types ─────────────────────────────────────────────────────────────────

export interface MilestoneToShow {
  id: string;
  label: string;
  icon: MilestoneIcon;
}

interface Props {
  milestones: MilestoneToShow[];
  onDismiss: () => void;
}

// ── CSS-only confetti — same approach as CompletionPanel ──────────────────

const CONFETTI_COLORS = [
  "bg-primary",
  "bg-amber-400",
  "bg-emerald-400",
  "bg-sky-400",
  "bg-pink-400",
  "bg-violet-400",
];

// ── Component ─────────────────────────────────────────────────────────────

const MilestoneModal = ({ milestones, onDismiss }: Props) => {
  const [visible, setVisible] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const hasFiredHaptic = useRef(false);
  const streakDays = useMemo(() => getProgressStats().currentStreak, []);
  const { generateAndShare, sharing } = useMilestoneShare(streakDays);

  const current = milestones[currentIdx];
  const isLast = currentIdx === milestones.length - 1;
  const IconComp = current ? ICON_MAP[current.icon] ?? Star : Star;

  useEffect(() => {
    // Slight delay so the modal entrance feels intentional
    const t1 = setTimeout(() => setVisible(true), 80);
    const t2 = setTimeout(() => {
      setShowConfetti(true);
      if (!hasFiredHaptic.current) {
        hapticSuccess();
        hasFiredHaptic.current = true;
      }
    }, 300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Re-trigger confetti and haptic when cycling to next milestone
  const handleNext = () => {
    setShowConfetti(false);
    setTimeout(() => {
      if (isLast) {
        handleClose();
      } else {
        setCurrentIdx((i) => i + 1);
        setShowConfetti(true);
        hapticSuccess();
      }
    }, 150);
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  if (!current) return null;

  return (
    <>
      {/* Keyframes */}
      <style>{`
        @keyframes ms-confetti {
          0%   { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
          100% { transform: translateY(220px) rotate(600deg) scale(0.5); opacity: 0; }
        }
        @keyframes ms-pop {
          0%   { transform: scale(0.3) rotate(-15deg); opacity: 0; }
          60%  { transform: scale(1.2) rotate(5deg); opacity: 1; }
          80%  { transform: scale(0.95) rotate(-2deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes ms-slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        @keyframes ms-shimmer {
          0%,100% { opacity: 0.6; }
          50%     { opacity: 1; }
        }
        .ms-icon   { animation: ms-pop 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .ms-text   { animation: ms-slide-up 0.4s ease-out 0.2s both; }
        .ms-action { animation: ms-slide-up 0.4s ease-out 0.35s both; }
        .ms-shimmer { animation: ms-shimmer 2s ease-in-out infinite; }
        .ms-confetti-particle {
          animation: ms-confetti var(--dur) ease-out var(--delay) forwards;
          opacity: 0;
        }
      `}</style>

      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-[100] bg-black/60 transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0"
        )}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={cn(
          "fixed inset-x-4 z-[101] mx-auto max-w-sm",
          "bottom-[calc(env(safe-area-inset-bottom,0px)+80px)]",
          "rounded-3xl border bg-card shadow-2xl overflow-hidden",
          "transition-all duration-300",
          visible
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-8 scale-95"
        )}
      >
        {/* Confetti burst — positioned relative to modal top */}
        {showConfetti && (
          <div className="absolute top-0 left-0 right-0 h-0 overflow-visible pointer-events-none" aria-hidden>
            {Array.from({ length: 22 }, (_, i) => (
              <div
                key={i}
                className={cn(
                  "absolute top-0 rounded-sm ms-confetti-particle",
                  i % 2 === 0 ? "w-2 h-2" : "w-1.5 h-1.5",
                  CONFETTI_COLORS[i % CONFETTI_COLORS.length]
                )}
                style={{
                  left: `${5 + (i * 18) % 88}%`,
                  ["--dur" as string]: `${0.8 + (i * 0.055) % 0.6}s`,
                  ["--delay" as string]: `${(i * 0.04) % 0.35}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Top accent bar */}
        <div className="h-1.5 w-full bg-primary" />

        {/* Content */}
        <div className="px-6 pt-8 pb-6 text-center">

          {/* Multiple milestone indicator */}
          {milestones.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 mb-4">
              {milestones.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === currentIdx
                      ? "w-5 bg-primary"
                      : i < currentIdx
                        ? "w-1.5 bg-primary/40"
                        : "w-1.5 bg-border"
                  )}
                />
              ))}
            </div>
          )}

          {/* Label above icon */}
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary mb-5 ms-text">
            Milestone Unlocked
          </p>

          {/* Icon — big, animated */}
          <div className="relative inline-flex mb-5">
            {/* Glow ring */}
            <div className="absolute inset-0 rounded-full bg-primary/15 scale-150 ms-shimmer" />
            <div className="relative h-20 w-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center ms-icon">
              <IconComp size={36} className="text-primary" strokeWidth={1.8} />
            </div>
          </div>

          {/* Milestone label */}
          <div className="ms-text">
            <h2 className="font-display text-2xl font-bold text-foreground leading-tight mb-2">
              {current.label}
            </h2>
            <p className="text-sm text-muted-foreground">
              {getFlavorText(current.icon)}
            </p>
          </div>

          {/* Actions */}
          <div className="mt-6 space-y-2 ms-action">
            <div className="flex gap-2">
              <ShareButton
                variant="outline"
                label="Share"
                busy={sharing}
                iconSize={15}
                onShare={() => generateAndShare({
                  id: current.id,
                  label: current.label,
                  description: getFlavorText(current.icon),
                  icon: current.icon,
                })}
                className="rounded-2xl px-4 py-3 h-auto active:scale-[0.97] transition-transform"
              />

              <Button
                size="lg"
                onClick={handleNext}
                className="flex-1 rounded-xl font-semibold h-12 active:scale-[0.97] transition-transform"
              >
                {isLast ? "Keep Playing" : `Next  (${currentIdx + 1}/${milestones.length})`}
              </Button>
            </div>
            {isLast && (
              <button
                type="button"
                onClick={handleClose}
                className="w-full text-sm text-muted-foreground py-2 hover:text-foreground transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// ── Flavor text per icon type ─────────────────────────────────────────────

function getFlavorText(icon: MilestoneIcon): string {
  switch (icon) {
    case "puzzle":  return "Your puzzle-solving journey is just getting started.";
    case "flame":   return "Consistency is the secret. Keep that streak burning.";
    case "trophy":  return "A true milestone. You're building something real.";
    case "medal":   return "Not everyone makes it this far. You did.";
    case "zap":     return "Speed, accuracy, persistence — you've got all three.";
    case "bolt":    return "Lightning fast. Your reflexes are sharpening.";
    case "crown":   return "Elite territory. The leaderboard is watching.";
    case "target":  return "Precision and dedication in equal measure.";
    case "award":   return "This one took real effort. Well deserved.";
    default:        return "Keep going — the next milestone is already in sight.";
  }
}

export default MilestoneModal;
