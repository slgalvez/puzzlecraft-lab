import { Trophy, Play, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
}: CraftSolveFirstProps) {

  // ── State: time already set ──────────────────────────────────────────────
  if (creatorSolveTime !== null) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3.5">
        <CheckCircle size={17} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 leading-tight">
            Your time: {formatTime(creatorSolveTime)}
          </p>
          <p className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">
            Can they beat you? The challenge is set.
          </p>
        </div>
      </div>
    );
  }

  // ── State: not yet set ───────────────────────────────────────────────────
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-4">
      <div className="flex items-start gap-3 mb-3.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Trophy size={14} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground leading-tight">
            Set a challenge time
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            Solve your own puzzle first — friends will try to beat your time.
          </p>
        </div>
      </div>

      {/* Co-equal actions: Solve + Skip */}
      <div className="flex gap-2">
        <Button
          onClick={() => { hapticTap(); onSolveFirst(); }}
          className="flex-1 gap-1.5 h-9 text-sm"
        >
          <Play size={13} className="fill-current" />
          Solve it first
        </Button>
        <Button
          variant="outline"
          onClick={() => { hapticTap(); onSkip(); }}
          className="flex-1 h-9 text-sm text-muted-foreground"
        >
          Skip for now
        </Button>
      </div>
    </div>
  );
}
