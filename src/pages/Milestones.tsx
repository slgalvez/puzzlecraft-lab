/**
 * Milestones.tsx — /milestones
 *
 * 4 tabs (Ranked · Solver · Crafter · Social).
 * Card hierarchy per tab: Up Next → In Progress → Achieved → Coming Up.
 * Glow animation plays once for newly unlocked milestones.
 */

import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
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
import type { NavigateFunction } from "react-router-dom";
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
  ranked:  { Icon: Zap,     color: "text-primary",     dotColor: "bg-primary",     bg: "bg-primary/10" },
  solver:  { Icon: Target,  color: "text-emerald-500", dotColor: "bg-emerald-500", bg: "bg-emerald-500/10" },
  crafter: { Icon: Palette, color: "text-amber-500",   dotColor: "bg-amber-500",   bg: "bg-amber-500/10" },
  social:  { Icon: Users,   color: "text-violet-500",  dotColor: "bg-violet-500",  bg: "bg-violet-500/10" },
};

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

function NextCard({ m, isNew }: { m: MilestoneResult; isNew: boolean; }) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card overflow-hidden",
        "border-primary/25 bg-primary/[0.02] shadow-sm",
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

        <p className="mt-2 text-[10px] text-primary/70">This is your next milestone</p>

        {m.progressLabel ? (
          m.progressRatio > 0 ? (
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">{m.progressLabel}</span>
                <span className="text-[10px] text-primary font-medium">
                  {Math.round(m.progressRatio * 100)}%
                </span>
              </div>
              <Progress value={m.progressRatio * 100} className="h-1.5" />
            </div>
          ) : (
            <p className="mt-3 text-[10px] text-muted-foreground">
              Not started — {m.progressLabel}
            </p>
          )
        ) : (
          <p className="mt-2 text-[10px] text-muted-foreground/50 italic">
            Moment-based — you'll know when it happens
          </p>
        )}
      </div>
    </div>
  );
}

function AchievedCard({ m, isNew }: { m: MilestoneResult; isNew: boolean; }) {
  const { color, bg } = TAB_META[m.tab];
  return (
    <div
      className={cn(
        "flex items-center gap-3.5 rounded-xl border px-4 py-3.5",
        "border-border/60 bg-card",
        isNew && "animate-milestone-glow",
      )}
    >
      <div className={cn("h-9 w-9 rounded-full flex items-center justify-center shrink-0", bg)}>
        <MilestoneIconView id={m.id} achieved tab={m.tab} size={15} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight">{m.name}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug truncate">
          {m.description}
        </p>
      </div>

      <CheckCircle2 size={14} className={cn("shrink-0", color)} />
    </div>
  );
}

function InProgressCard({ m }: { m: MilestoneResult }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card px-4 py-3.5 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0 mr-3">
          <p className="text-sm font-semibold text-foreground/80 leading-tight">{m.name}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{m.description}</p>
        </div>
        <MilestoneIconView id={m.id} achieved={false} tab={m.tab} size={15} />
      </div>
      {m.progressLabel && (
        <div className="space-y-1.5">
          <Progress value={m.progressRatio * 100} className="h-1" />
          <p className="text-[10px] text-muted-foreground">{m.progressLabel}</p>
        </div>
      )}
    </div>
  );
}

function LockedCard({ m }: { m: MilestoneResult }) {
  const showLockedHint = m.progressLabel && m.progressRatio === 0;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/30 bg-muted/10 px-4 py-3 opacity-60">
      <Lock size={13} className="text-muted-foreground/40 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-muted-foreground/70 leading-tight">{m.name}</p>
        <p className="text-[11px] text-muted-foreground/50 mt-0.5 truncate">
          {showLockedHint ? `Locked — ${m.description}` : m.description}
        </p>
      </div>
    </div>
  );
}

// ── Tab content ────────────────────────────────────────────────────────────────

const EMPTY_TAB_COPY: Record<MilestoneTab, { headline: string; cta: string; route: string }> = {
  ranked:  { headline: "Solve 10 puzzles to earn your Player Rating", cta: "Play Daily", route: "/daily" },
  solver:  { headline: "Solve a puzzle to start unlocking milestones", cta: "Play Daily", route: "/daily" },
  crafter: { headline: "Create and send a puzzle to begin", cta: "Create a Puzzle", route: "/craft" },
  social:  { headline: "Play or share a puzzle with someone to unlock these", cta: "Create a Puzzle", route: "/craft" },
};

function TabContent({
  tab, uncelebratedIds, navigate,
}: { tab: MilestoneTab; uncelebratedIds: Set<string>; navigate: NavigateFunction; }) {
  const milestones = useMemo(() => getMilestonesForTab(tab), [tab]);

  const next       = milestones.find((m) => m.isNext && m.state !== "achieved");
  const inProgress = milestones.filter((m) => m.state === "in-progress" && !m.isNext);
  const achieved   = milestones.filter((m) => m.state === "achieved");
  const locked     = milestones.filter((m) => m.state === "locked" && !m.isNext);

  const allDone = milestones.every((m) => m.state === "achieved");
  const isTabEmpty = milestones.every((m) => m.state === "locked");

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

  const emptyCopy = EMPTY_TAB_COPY[tab];

  return (
    <div className="space-y-5">
      {isTabEmpty ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-5 text-center space-y-3">
          <p className="text-sm font-semibold text-foreground">{emptyCopy.headline}</p>
          <Button variant="default" size="sm" onClick={() => navigate(emptyCopy.route)}>
            {emptyCopy.cta}
          </Button>
        </div>
      ) : (
        next && <NextCard m={next} isNew={uncelebratedIds.has(next.id)} />
      )}

      {inProgress.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-0.5">
            In Progress
          </p>
          {inProgress.map((m) => <InProgressCard key={m.id} m={m} />)}
        </div>
      )}

      {achieved.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-0.5">
            Achieved
          </p>
          {achieved.map((m) => (
            <AchievedCard key={m.id} m={m} isNew={uncelebratedIds.has(m.id)} />
          ))}
        </div>
      )}

      {locked.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-0.5">
            Coming Up
          </p>
          {locked.map((m) => <LockedCard key={m.id} m={m} />)}
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function Milestones() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<MilestoneTab>("solver");
  const [uncelebratedIds, setUncelebratedIds] = useState<Set<string>>(new Set());
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem("milestones_seen_intro");
  });

  const dismissIntro = () => {
    try { localStorage.setItem("milestones_seen_intro", "true"); } catch {}
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

  const totalAchieved = allMilestones.filter((m) => m.state === "achieved").length;
  const totalCount    = allMilestones.length;

  return (
    <Layout>
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

      <div className="container py-6 md:py-10 max-w-2xl">
        <div className="mb-1">
          <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            Milestones
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          {totalAchieved === 0
            ? "Every milestone you earn is part of who you are here."
            : totalAchieved === totalCount
              ? "You've done everything. That's all of them."
              : `${totalAchieved} of ${totalCount} earned.`}
        </p>

        {showIntro && (
          <div className="rounded-2xl bg-secondary/40 px-4 py-3.5 mb-4">
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

        <div className="flex gap-2 overflow-x-auto pb-1 mb-6">
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
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground",
                )}
              >
                <Icon size={13} className={cn(isActive ? "text-background" : color)} />
                {label}
                {counts.achieved > 0 && (
                  <span className={cn(
                    "text-[9px] font-bold",
                    isActive ? "text-background/70" : "text-muted-foreground/60",
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

        <TabContent tab={activeTab} uncelebratedIds={uncelebratedIds} navigate={navigate} />

        {totalAchieved === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-border/60 p-6 text-center space-y-3">
            <p className="text-sm font-semibold text-foreground">Start earning</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Solve your first puzzle to unlock "First Crack." Every milestone after that builds from there.
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate("/daily")}>
              Play today's challenge
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
