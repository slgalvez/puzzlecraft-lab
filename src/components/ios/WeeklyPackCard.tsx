import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Lock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { hapticTap } from "@/lib/haptic";
import { getCurrentWeeklyPack, getPackCompletionCount, fetchDbCustomPacks } from "@/lib/weeklyPacks";
import { usePremiumAccess } from "@/lib/premiumAccess";
import { useUserAccount } from "@/contexts/UserAccountContext";
import UpgradeModal from "@/components/account/UpgradeModal";

export function WeeklyPackCard() {
  const navigate = useNavigate();
  const { isPremium } = usePremiumAccess();
  const { account } = useUserAccount();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [ready, setReady] = useState(false);

  // Warm DB cache then compute pack
  useEffect(() => {
    fetchDbCustomPacks().then(() => setReady(true));
  }, []);

  const pack = useMemo(
    () => getCurrentWeeklyPack(account ? { subscribed: account.isPremium, isAdmin: account.isAdmin } : null),
    [account, ready]
  );
  const completed = getPackCompletionCount(pack.id);
  const progressPct = (completed / pack.puzzles.length) * 100;

  // Expiry countdown: pack expires 7 days after release
  const daysRemaining = useMemo(() => {
    if (!pack.releaseDate) return null;
    const expiry = new Date(pack.releaseDate);
    expiry.setDate(expiry.getDate() + 7);
    const diff = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }, [pack.releaseDate]);

  const anyAccessible = pack.puzzles.some(p => p.isAccessible);

  const handlePlay = (puzzleIndex?: number) => {
    hapticTap();
    const target = puzzleIndex != null ? pack.puzzles[puzzleIndex] : null;

    // If a specific locked puzzle was tapped
    if (target && !target.isAccessible) {
      if (!isPremium) setUpgradeOpen(true);
      return;
    }

    // If nothing is accessible yet
    if (!anyAccessible) {
      if (!isPremium) setUpgradeOpen(true);
      return;
    }

    // Find first incomplete accessible puzzle, or the tapped one
    const progress = JSON.parse(localStorage.getItem("puzzlecraft_pack_progress") ?? "{}");
    const completedIds: string[] = progress[pack.id] ?? [];

    const puzzle = target ?? pack.puzzles.find(
      (p) => p.isAccessible && !completedIds.includes(p.id)
    ) ?? pack.puzzles.find(p => p.isAccessible) ?? pack.puzzles[0];

    navigate(
      `/quick-play/${puzzle.type}?seed=${puzzle.numericSeed}&d=${puzzle.difficulty}&pack=${pack.id}&packPuzzle=${puzzle.id}`
    );
  };

  return (
    <>
      <button
        onClick={() => handlePlay()}
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

          {anyAccessible
            ? <ChevronRight size={16} className="text-muted-foreground/60 shrink-0" />
            : <Lock size={14} className="text-muted-foreground/60 shrink-0" />
          }
        </div>

        <p className="px-4 text-xs text-muted-foreground leading-snug pb-2">
          {pack.description}
        </p>

        <div className="flex gap-1.5 px-4 pb-3 flex-wrap">
          {pack.puzzles.map((p, i) => {
            const isCompleted = i < completed;
            return (
              <span
                key={p.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlay(i);
                }}
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9px] font-medium border cursor-pointer",
                  isCompleted
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400/40 text-emerald-700 dark:text-emerald-400"
                    : p.isAccessible
                    ? "bg-muted/40 border-border/40 text-muted-foreground hover:bg-muted/60"
                    : "bg-muted/20 border-border/20 text-muted-foreground/50"
                )}
              >
                {!p.isAccessible && <Lock size={7} className="shrink-0" />}
                {p.title}
                {p.isSample && !isPremium && p.isAccessible && (
                  <span className="text-[8px] text-primary font-semibold ml-0.5">FREE</span>
                )}
              </span>
            );
          })}
        </div>

        <div className="border-t border-border/40 px-4 py-2.5">
          {anyAccessible ? (
            <div className="space-y-1.5">
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
              {!isPremium && pack.isFreeUnlocked && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {pack.freeCount} free puzzle · {pack.puzzles.length - pack.freeCount} more with Plus
                  </span>
                  <span className="text-[10px] font-medium text-primary">Upgrade →</span>
                </div>
              )}
              {daysRemaining != null && (
                <div className="flex items-center gap-1">
                  {daysRemaining < 3 && (
                    <span className={cn(
                      "inline-block w-1.5 h-1.5 rounded-full",
                      daysRemaining < 1 ? "bg-destructive" : "bg-amber-500"
                    )} />
                  )}
                  <span className={cn(
                    "text-[10px]",
                    daysRemaining < 1
                      ? "font-medium text-destructive"
                      : daysRemaining < 3
                      ? "font-medium text-amber-600 dark:text-amber-400"
                      : "text-muted-foreground"
                  )}>
                    {daysRemaining < 1
                      ? "Ends today"
                      : daysRemaining === 1
                      ? "Ends tomorrow"
                      : `Ends in ${daysRemaining} days`}
                  </span>
                </div>
              )}
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
