/**
 * MilestonesSection — shared milestones UI
 *
 * Used as the primary milestone surface inside Stats (compact mode) and
 * also rendered full-bleed by the standalone /milestones page.
 *
 * Behavior is 1:1 with the previous Milestones page implementation:
 *  - 4 tabs (Ranked · Solver · Crafter · Social)
 *  - Up Next → In Progress → Achieved → Coming Up hierarchy
 *  - One-shot ready gate (skeletons only on first mount)
 *  - Intro card gated by localStorage("milestones_seen_intro")
 *  - Per-tab "new" dot driven by getUncelebratedIds()
 *  - Glow animation for newly unlocked milestones
 */

import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, type NavigateFunction } from "react-router-dom";
import {
  getAllMilestones,
  getMilestonesForTab,
  getUncelebratedIds,
  markCelebrated,
  MILESTONE_TABS,
  type MilestoneResult,
  type MilestoneTab,
} from "@/lib/milestones";
import {
  Zap, Target, Palette, Users, Trophy, Flame, Shield,
  Star, Lock, ArrowUpRight, CheckCircle2, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// ── Tab meta ───────────────────────────────────────────────────────────────────

const TAB_META: Record<MilestoneTab, {
  Icon: React.ElementType;
  color: string;
  dotColor: string;
  bg: string;
}> = {
  ranked:  { Icon: Zap,     color: "text-primary",     dotColor: "bg-primary",     bg: "bg-primary/15" },
  solver:  { Icon: Target,  color: "text-emerald-500", dotColor: "bg-emerald-500", bg: "bg-emerald-500/15" },
  crafter: { Icon: Palette, color: "text-amber-500",   dotColor: "bg-amber-500",   bg: "bg-amber-500/15" },
  social:  { Icon: Users,   color: "text-violet-500",  dotColor: "bg-violet-500",  bg: "bg-violet-500/15" },
};

// ── Copy lookups ───────────────────────────────────────────────────────────────

const ENCOURAGEMENT: Record<MilestoneTab, string> = {
  ranked:  "Every solve sharpens your rating",
  solver:  "Every solve builds momentum",
  crafter: "Every puzzle you make starts something",
  social:  "Every send turns into a connection",
};

const GOAL_LINE: Record<string, string> = {
  "off-the-bench":  "Solve 10 puzzles to get started",
  "tier-skilled":   "Reach the Skilled tier to unlock",
  "tier-advanced":  "Reach the Advanced tier to unlock",
  "tier-expert":    "Reach the Expert tier to unlock",
  "on-a-roll":      "Build a 3-day streak to unlock",
  "iron-habit":     "Hold a 30-day streak to unlock",
  "the-long-game":  "Play all 8 puzzle types to unlock",
  "puzzle-maker":   "Send 5 puzzles to unlock",
  "made-something": "Send your first puzzle to unlock",
};
function goalLine(id: string) {
  return GOAL_LINE[id] ?? "Start to unlock this milestone";
}

const ZERO_STATE_HELPER: Record<MilestoneTab, string> = {
  ranked:  "Start playing to begin",
  solver:  "Start playing to begin",
  crafter: "Start creating to begin",
  social:  "Play or share to begin",
};

/** Reformat "3 of 10 solves" → "0 / 10 solves" baseline label. */
function baselineLabel(m: MilestoneResult): string | null {
  if (!m.progressLabel) return null;
  const match = m.progressLabel.match(/^(\d+)\s+of\s+(\d+)\s+(.+)$/i);
  if (!match) return null;
  const target = parseInt(match[2], 10);
  const unit = match[3].trim();
  return `0 / ${target} ${unit}`;
}



function MilestoneIconView({
  id, achieved, tab, size = 18,
}: { id: string; achieved: boolean; tab: MilestoneTab; size?: number; }) {
  const { color } = TAB_META[tab];

  const icon = (() => {
    if (id.includes("expert"))             return <Trophy size={size} />;
    if (id.includes("advanced"))           return <Shield size={size} />;
    if (id.includes("skilled"))            return <Star size={size} />;
    if (id.includes("off-the-bench"))      return <Zap size={size} />;
    if (id.includes("iron-habit"))         return <Flame size={size} />;
    if (id.includes("on-a-roll"))          return <Flame size={size} />;
    if (id.includes("clean-sheet"))        return <CheckCircle2 size={size} />;
    if (id.includes("long-game"))          return <Target size={size} />;
    if (id.includes("first-crack"))        return <Zap size={size} />;
    if (id.includes("made-something"))     return <Sparkles size={size} />;
    if (id.includes("they-solved"))        return <Trophy size={size} />;
    if (id.includes("puzzle-maker"))       return <Palette size={size} />;
    if (id.includes("challenge-accepted")) return <Users size={size} />;
    if (id.includes("game-on"))            return <Zap size={size} />;
    return <Star size={size} />;
  })();

  return (
    <span className={cn(achieved ? color : "text-muted-foreground/40")}>
      {icon}
    </span>
  );
}

// ── Cards ──────────────────────────────────────────────────────────────────────

/** Parse a progressLabel like "3 of 10 solves" → "7 more solves to go". */
function remainingLine(m: MilestoneResult): string | null {
  if (!m.progressLabel) return null;
  // Match patterns like "3 of 10 solves", "1200 of 1300 rating", "2 of 3 days"
  const match = m.progressLabel.match(/^(\d+)\s+of\s+(\d+)\s+(.+)$/i);
  if (!match) return null;
  const current = parseInt(match[1], 10);
  const target  = parseInt(match[2], 10);
  const unit    = match[3].trim();
  const remaining = Math.max(0, target - current);
  if (remaining === 0) return null;
  return `${remaining} more ${unit} to go`;
}

const NEXT_CTA: Record<MilestoneTab, { label: string; route: string }> = {
  ranked:  { label: "Play now →",   route: "/daily" },
  solver:  { label: "Play now →",   route: "/daily" },
  social:  { label: "Play now →",   route: "/daily" },
  crafter: { label: "Create now →", route: "/craft" },
};

function NextCard({ m, isNew, navigate }: { m: MilestoneResult; isNew: boolean; navigate: NavigateFunction; }) {
  const cta = NEXT_CTA[m.tab];
  const remaining = remainingLine(m);
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card overflow-hidden",
        "border-primary/40 bg-primary/5 shadow-sm",
        isNew && "animate-milestone-glow",
      )}
    >
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
            <ArrowUpRight size={11} />
            Up Next
          </span>
          <MilestoneIconView id={m.id} achieved={false} tab={m.tab} size={16} />
        </div>

        <p className="text-base font-bold text-foreground leading-tight">{m.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{m.description}</p>

        <p className="mt-2 text-[10px] text-primary/70">Almost there</p>

        {m.progressLabel ? (
          m.progressRatio > 0 ? (
            <div className="mt-3 space-y-1.5">
              <Progress value={m.progressRatio * 100} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground">
                {remaining ?? m.progressLabel}
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-1.5">
              <Progress value={0} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground">{baselineLabel(m) ?? m.progressLabel}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{ZERO_STATE_HELPER[m.tab]}</p>
            </div>
          )
        ) : null}

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(cta.route)}
          className="mt-3 h-8 px-3 text-xs text-primary border-primary/30 hover:bg-primary/5 hover:text-primary"
        >
          {cta.label}
        </Button>
      </div>
    </div>
  );
}
// ── MilestoneTile (unified grid tile) ─────────────────────────────────────────

type TileVariant = "active" | "not-started" | "completed" | "future";

/** Future = locked-by-prerequisite. Heuristic: tier ladder + iron-habit depends on on-a-roll. */
function isFutureMilestone(m: MilestoneResult, all: MilestoneResult[]): boolean {
  const achieved = (id: string) => all.some((x) => x.id === id && x.state === "achieved");
  if (m.id === "tier-advanced") return !achieved("tier-skilled");
  if (m.id === "tier-expert")   return !achieved("tier-skilled") || !achieved("tier-advanced");
  if (m.id === "iron-habit")    return !achieved("on-a-roll");
  return false;
}

function tileVariant(m: MilestoneResult, all: MilestoneResult[]): TileVariant {
  if (m.state === "achieved") return "completed";
  if (m.state === "in-progress" && m.progressRatio > 0 && m.progressRatio < 1) return "active";
  if (isFutureMilestone(m, all)) return "future";
  return "not-started";
}

function MilestoneTile({
  m, isNew, all, emphasis = "mid",
}: {
  m: MilestoneResult;
  isNew: boolean;
  all: MilestoneResult[];
  emphasis?: "first" | "mid" | "last";
}) {
  const variant = tileVariant(m, all);
  const { color, bg } = TAB_META[m.tab];
  const emphasisBorder = emphasis === "first" ? "border-primary/30" : "";
  const emphasisOpacity = emphasis === "last" ? "opacity-85" : "";

  if (variant === "completed") {
    return (
      <div
        className={cn(
          "rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3",
          "transition-all hover:shadow-sm hover:-translate-y-[1px]",
          isNew && "animate-milestone-glow",
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0", "bg-primary/15")}>
            <MilestoneIconView id={m.id} achieved tab={m.tab} size={14} />
          </div>
          <CheckCircle2 size={14} className={cn("shrink-0 mt-1", color)} />
        </div>
        <p className="text-sm font-semibold text-foreground leading-tight">{m.name}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{m.description}</p>
        <p className="text-[11px] text-primary mt-1">Completed</p>
      </div>
    );
  }

  if (variant === "future") {
    return (
      <div className={cn(
        "rounded-2xl border bg-card px-4 py-3 transition-all hover:shadow-sm hover:-translate-y-[1px]",
        emphasisBorder || "border-border/40",
        emphasisOpacity || "opacity-85",
      )}>
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-muted/40">
            <Lock size={13} className="text-muted-foreground/60" />
          </div>
        </div>
        <p className="text-sm font-semibold text-foreground/90 leading-tight">{m.name}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{m.description}</p>
        <p className="text-[11px] text-muted-foreground mt-2">Complete the step before</p>
      </div>
    );
  }

  if (variant === "active") {
    return (
      <div className={cn(
        "rounded-2xl border bg-card px-4 py-3 transition-all hover:shadow-sm hover:-translate-y-[1px]",
        emphasisBorder || "border-border/60",
        emphasisOpacity,
      )}>
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0", bg)}>
            <MilestoneIconView id={m.id} achieved={false} tab={m.tab} size={14} />
          </div>
        </div>
        <p className="text-sm font-semibold text-foreground leading-tight">{m.name}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{m.description}</p>
        {m.progressLabel && (
          <div className="mt-2 space-y-1">
            <Progress value={m.progressRatio * 100} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">{m.progressLabel}</p>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground mt-1">Keep going</p>
      </div>
    );
  }

  // not-started
  const baseline = baselineLabel(m);
  return (
    <div className={cn(
      "rounded-2xl border bg-card px-4 py-3 transition-all hover:shadow-sm hover:-translate-y-[1px]",
      emphasisBorder || "border-border/60",
      emphasisOpacity,
    )}>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0", bg)}>
          <MilestoneIconView id={m.id} achieved={false} tab={m.tab} size={14} />
        </div>
      </div>
      <p className="text-sm font-semibold text-foreground leading-tight">{m.name}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{m.description}</p>
      {baseline ? (
        <>
          <div className="mt-2 space-y-1">
            <Progress value={0} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">{baseline}</p>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">{ZERO_STATE_HELPER[m.tab]}</p>
        </>
      ) : (
        <p className="text-[11px] text-muted-foreground mt-2">Start here</p>
      )}
    </div>
  );
}

// ── Tab content ────────────────────────────────────────────────────────────────

const EMPTY_TAB_COPY: Record<MilestoneTab, { headline: string; cta: string; route: string }> = {
  ranked:  { headline: "Solve 10 puzzles to earn your first rating", cta: "Play Daily", route: "/daily" },
  solver:  { headline: "Start solving to unlock your first milestone", cta: "Play Daily", route: "/daily" },
  crafter: { headline: "Create your first puzzle to begin", cta: "Create a Puzzle", route: "/craft" },
  social:  { headline: "Play or share with someone to unlock these", cta: "Create a Puzzle", route: "/craft" },
};

const VARIANT_ORDER: Record<TileVariant, number> = {
  active: 0,
  "not-started": 1,
  future: 2,
  completed: 3,
};

function TabContent({
  tab, uncelebratedIds, navigate, compact,
}: {
  tab: MilestoneTab;
  uncelebratedIds: Set<string>;
  navigate: NavigateFunction;
  compact: boolean;
}) {
  const milestones = useMemo(() => getMilestonesForTab(tab), [tab]);

  let next = milestones.find((m) => m.isNext && m.state !== "achieved");

  // Fallback: if no canonical "Up Next", surface the first non-achieved tile.
  if (!next) {
    next = milestones.find((m) => m.state !== "achieved");
  }

  const tiles = milestones.filter((m) => m.id !== next?.id);
  tiles.sort((a, b) => {
    const va = VARIANT_ORDER[tileVariant(a, milestones)];
    const vb = VARIANT_ORDER[tileVariant(b, milestones)];
    if (va !== vb) return va - vb;
    return 0;
  });

  // Compact (Stats embed) caps total visible tiles to 6.
  const tilesToShow = compact ? tiles.slice(0, 6) : tiles;

  const allDone = milestones.every((m) => m.state === "achieved");

  if (allDone) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <div className="text-4xl">🏆</div>
        <p className="font-display text-base font-bold text-foreground">Tab complete.</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Every milestone in this tab is yours. That's the whole thing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {next && <NextCard m={next} isNew={uncelebratedIds.has(next.id)} navigate={navigate} />}

      {tilesToShow.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tilesToShow.map((m, i) => (
            <MilestoneTile
              key={m.id}
              m={m}
              isNew={uncelebratedIds.has(m.id)}
              all={milestones}
              emphasis={
                i === 0 ? "first"
                : i === tilesToShow.length - 1 ? "last"
                : "mid"
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Public component ───────────────────────────────────────────────────────────

export interface MilestonesSectionProps {
  /** Default selected tab. Defaults to "solver". */
  defaultTab?: MilestoneTab;
  /** Compact mode hides the "Coming Up" locked list and uses tighter top spacing. */
  compact?: boolean;
  /** Render a small right-aligned "View all →" link to /milestones. */
  showViewAllLink?: boolean;
}

/** Pick the first canonical tab with the most useful content. */
function computeSmartDefaultTab(milestones: MilestoneResult[]): MilestoneTab {
  const tabOrder: MilestoneTab[] = ["ranked", "solver", "crafter", "social"];
  // 1. Tab with achieved or in-progress
  for (const t of tabOrder) {
    if (milestones.some(
      (m) => m.tab === t && (m.state === "achieved" || m.state === "in-progress"),
    )) return t;
  }
  // 2. Tab with any started progress
  for (const t of tabOrder) {
    if (milestones.some((m) => m.tab === t && m.progressRatio > 0)) return t;
  }
  return "solver";
}

export function MilestonesSection({
  defaultTab,
  compact = false,
  showViewAllLink = false,
}: MilestonesSectionProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<MilestoneTab>(
    () => defaultTab ?? computeSmartDefaultTab(getAllMilestones()),
  );
  const [uncelebratedIds, setUncelebratedIds] = useState<Set<string>>(new Set());
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem("milestones_seen_intro");
  });

  const [ready, setReady] = useState(false);
  const readyOnceRef = useRef(false);
  useEffect(() => {
    if (readyOnceRef.current) return;
    readyOnceRef.current = true;
    setReady(true);
  }, []);

  const dismissIntro = () => {
    try { localStorage.setItem("milestones_seen_intro", "true"); } catch { }
    setShowIntro(false);
  };

  useEffect(() => {
    const ids = getUncelebratedIds();
    setUncelebratedIds(ids);
    if (ids.size > 0) {
      const t = setTimeout(() => {
        markCelebrated([...ids]);
        setUncelebratedIds(new Set());
      }, 2000);
      return () => clearTimeout(t);
    }
  }, []);

  const allMilestones = useMemo(() => getAllMilestones(), []);
  const hasAnyProgress = useMemo(
    () => allMilestones.some(
      (m) => m.state === "achieved" || m.state === "in-progress" || m.progressRatio > 0,
    ),
    [allMilestones],
  );
  const tabCounts = useMemo(() => {
    const out: Record<MilestoneTab, { achieved: number; total: number }> = {
      ranked: { achieved: 0, total: 0 },
      solver: { achieved: 0, total: 0 },
      crafter: { achieved: 0, total: 0 },
      social: { achieved: 0, total: 0 },
    };
    for (const m of allMilestones) {
      out[m.tab].total++;
      if (m.state === "achieved") out[m.tab].achieved++;
    }
    return out;
  }, [allMilestones]);

  return (
    <div>
      <style>{`
        @keyframes milestone-glow {
          0%   { box-shadow: 0 0 0 0 hsl(var(--primary) / 0.4); }
          40%  { box-shadow: 0 0 0 6px hsl(var(--primary) / 0); }
          100% { box-shadow: 0 0 0 0 hsl(var(--primary) / 0); }
        }
        .animate-milestone-glow {
          animation: milestone-glow 1.6s ease-out;
        }
      `}</style>

      {showIntro && (
        <div className={cn("rounded-2xl bg-secondary/40 px-4 py-3.5", compact ? "mb-3" : "mb-4")}>
          <div className="flex items-start gap-2.5">
            <Sparkles size={14} className="text-primary/70 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground mb-1">How milestones work</p>
              <p className="text-xs text-muted-foreground leading-snug">
                Milestones track how you play. Complete puzzles, build streaks, create and share — each one unlocks as you go. Focus on what's marked <span className="font-semibold text-foreground">Next</span>.
              </p>
            </div>
            <button
              onClick={dismissIntro}
              className="text-xs font-semibold text-primary shrink-0 px-1 py-0.5"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <div className={cn("flex items-center justify-between gap-3", compact ? "mb-3" : "mb-6")}>
        <div className="flex gap-2 overflow-x-auto pb-1 flex-1 min-w-0">
          {MILESTONE_TABS.map(({ id, label }) => {
            const { Icon, color, dotColor } = TAB_META[id];
            const counts   = tabCounts[id];
            const isActive = activeTab === id;
            const hasNew   = [...uncelebratedIds].some((uid) =>
              allMilestones.find((m) => m.id === uid && m.tab === id),
            );

            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "relative shrink-0 flex items-center gap-1.5 rounded-full px-4 py-2",
                  "text-sm font-medium border transition-all duration-150",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground",
                )}
              >
                <Icon size={13} className={cn(isActive ? "text-primary-foreground" : color)} />
                {label}
                {counts.achieved > 0 && (
                  <span className={cn(
                    "text-[9px] font-bold",
                    isActive ? "text-primary-foreground/80" : "text-muted-foreground/60",
                  )}>
                    {counts.achieved}/{counts.total}
                  </span>
                )}
                {hasNew && (
                  <span className={cn(
                    "absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-background",
                    dotColor,
                  )} />
                )}
              </button>
            );
          })}
        </div>

        {showViewAllLink && (
          <button
            type="button"
            onClick={() => navigate("/milestones")}
            className="shrink-0 text-xs font-medium text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
          >
            View all →
          </button>
        )}
      </div>

      {ready ? (
        hasAnyProgress ? (
          <TabContent
            tab={activeTab}
            uncelebratedIds={uncelebratedIds}
            navigate={navigate}
            compact={compact}
          />
        ) : (
          (() => {
            const emptyCopy = EMPTY_TAB_COPY[activeTab];
            return (
              <div className="rounded-2xl border border-dashed border-border/60 p-5 text-center space-y-3">
                <p className="text-sm font-semibold text-foreground">{emptyCopy.headline}</p>
                <Button variant="default" size="sm" onClick={() => navigate(emptyCopy.route)}>
                  {emptyCopy.cta}
                </Button>
              </div>
            );
          })()
        )
      ) : (
        <div className="space-y-3" aria-hidden="true">
          <Skeleton className="h-[88px] rounded-2xl" />
          <Skeleton className="h-[88px] rounded-2xl" />
          <Skeleton className="h-[88px] rounded-2xl" />
        </div>
      )}
    </div>
  );
}

export default MilestonesSection;
