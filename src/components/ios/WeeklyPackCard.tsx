import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Lock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { hapticTap } from "@/lib/haptic";
import { getCurrentWeeklyPack, getPackCompletionCount } from "@/lib/weeklyPacks";
import { usePremiumAccess } from "@/lib/premiumAccess";
import UpgradeModal from "@/components/account/UpgradeModal";

export function WeeklyPackCard() {
  const navigate = useNavigate();
  const { isPremium } = usePremiumAccess();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const pack = useMemo(() => getCurrentWeeklyPack(null), []);
  const completed = getPackCompletionCount(pack.id, pack.puzzles.length);
  const progressPct = (completed / pack.puzzles.length) * 100;

  const handlePlay = () => {
    hapticTap();
    if (!pack.isUnlocked) {
      if (!isPremium) setUpgradeOpen(true);
      return;
    }
    const firstIncomplete = pack.puzzles.find(
      (p) => !JSON.parse(localStorage.getItem("puzzlecraft_pack_progress") ?? "{}")[pack.id]?.includes(p.id)
    ) ?? pack.puzzles[0];

    navigate(
      `/quick-play/${firstIncomplete.type}?seed=${firstIncomplete.seed}&d=${firstIncomplete.difficulty}&pack=${pack.id}&packPuzzle=${firstIncomplete.id}`
    );
  };

  return (
    <>
      <button
        onClick={handlePlay}
        className={cn(
          "w-full rounded-2xl border bg-card overflow-hidden",
          "transition-all duration-150 active:scale-[0.98]",
          "text-left"
        )}
      >
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl leading-none">{pack.emoji}</span>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Weekly Pack
                </p>
                {!isPremium && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                    <Crown size={8} />
                    Early Friday
                  </span>
                )}
              </div>
              <p className="text-sm font-bold text-foreground leading-tight">
                {pack.theme}
              </p>
            </div>
          </div>

          {pack.isUnlocked
            ? <ChevronRight size={16} className="text-muted-foreground/60 shrink-0" />
            : <Lock size={14} className="text-muted-foreground/60 shrink-0" />
          }
        </div>

        <p className="px-4 text-xs text-muted-foreground leading-snug pb-2">
          {pack.description}
        </p>

        <div className="flex gap-1.5 px-4 pb-3 flex-wrap">
          {pack.puzzles.map((p, i) => (
            <span
              key={p.id}
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-medium border",
                i < completed
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400/40 text-emerald-700 dark:text-emerald-400"
                  : "bg-muted/40 border-border/40 text-muted-foreground"
              )}
            >
              {p.title}
            </span>
          ))}
        </div>

        <div className="border-t border-border/40 px-4 py-2.5">
          {pack.isUnlocked ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full bg-border/50 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground shrink-0">
                {completed}/{pack.puzzles.length} done
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                {!isPremium
                  ? `Plus members unlock Friday · Everyone Sunday`
                  : `Unlocks in ${pack.unlocksIn}`
                }
              </span>
              {!isPremium && (
                <span className="text-[11px] font-medium text-primary">Get early access →</span>
              )}
            </div>
          )}
        </div>
      </button>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </>
  );
}
