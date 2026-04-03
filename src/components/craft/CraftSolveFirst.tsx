import { Trophy, Play, ChevronRight, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { hapticTap } from "@/lib/haptic";

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

interface CraftSolveFirstProps {
  creatorSolveTime: number | null;
  onSolveFirst: () => void;
  onSkip: () => void;
  puzzleTypeLabel: string;
}

export function CraftSolveFirst({
  creatorSolveTime,
  onSolveFirst,
  onSkip,
  puzzleTypeLabel,
}: CraftSolveFirstProps) {

  if (creatorSolveTime !== null) {
    return (
      <div className="rounded-2xl border border-emerald-400/40 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-4">
        <div className="flex items-start gap-3">
          <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              Challenge set — {formatTime(creatorSolveTime)}
            </p>
            <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
              Friends will see your time and try to beat it. Your{" "}
              {puzzleTypeLabel.toLowerCase()} is ready to share.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 overflow-hidden">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Trophy size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Set a challenge time
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
              Solve your own puzzle to set a time friends will try to beat.
              This is what makes Puzzlecraft unique — no other app does this.
            </p>
          </div>
        </div>

        <button
          onClick={() => { hapticTap(); onSolveFirst(); }}
          className={cn(
            "w-full flex items-center justify-between rounded-xl",
            "bg-primary px-4 py-3",
            "transition-all active:scale-[0.97]"
          )}
        >
          <div className="flex items-center gap-2">
            <Play size={14} className="text-primary-foreground" />
            <span className="text-sm font-semibold text-primary-foreground">
              Solve it first
            </span>
          </div>
          <span className="text-[11px] text-primary-foreground/70">
            sets challenge time →
          </span>
        </button>
      </div>

      <div className="border-t border-border/30 px-4 py-2.5">
        <button
          onClick={() => { hapticTap(); onSkip(); }}
          className="w-full flex items-center justify-between text-xs text-muted-foreground"
        >
          <span>Share without a challenge time</span>
          <ChevronRight size={13} className="text-muted-foreground/50" />
        </button>
      </div>
    </div>
  );
}
