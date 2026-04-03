/**
 * EmptyState.tsx
 * Reusable empty state component. Replaces plain "no data" text
 * across CraftInbox, Stats, puzzle type breakdowns, leaderboard.
 */

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  headline: string;
  description: string;
  ctaLabel?: string;
  onCta?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  headline,
  description,
  ctaLabel,
  onCta,
  secondaryLabel,
  onSecondary,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center text-center",
      compact ? "py-6 px-4" : "py-12 px-6",
      className
    )}>
      {Icon && (
        <div className={cn(
          "flex items-center justify-center rounded-2xl bg-primary/10 mb-4",
          compact ? "w-12 h-12" : "w-16 h-16"
        )}>
          <Icon
            size={compact ? 22 : 28}
            className="text-primary/70"
            strokeWidth={1.5}
          />
        </div>
      )}

      <p className={cn(
        "font-semibold text-foreground",
        compact ? "text-sm" : "text-base"
      )}>
        {headline}
      </p>

      <p className={cn(
        "text-muted-foreground mt-1.5 leading-snug max-w-[260px]",
        compact ? "text-xs" : "text-sm"
      )}>
        {description}
      </p>

      {ctaLabel && onCta && (
        <button
          onClick={onCta}
          className={cn(
            "mt-4 rounded-full bg-primary px-5 font-semibold text-primary-foreground",
            "transition-all active:scale-[0.97]",
            compact ? "py-2 text-xs" : "py-2.5 text-sm"
          )}
        >
          {ctaLabel}
        </button>
      )}

      {secondaryLabel && onSecondary && (
        <button
          onClick={onSecondary}
          className="mt-2.5 text-xs text-muted-foreground underline underline-offset-2"
        >
          {secondaryLabel}
        </button>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PRE-BUILT EMPTY STATES
// ══════════════════════════════════════════════════════════════════════════════

import {
  Inbox, Send, PenLine, BarChart2, Trophy, Star
} from "lucide-react";

export function EmptyCraftReceived({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <EmptyState
      icon={Inbox}
      headline="No puzzles from friends yet"
      description="When a friend sends you a craft puzzle, it'll appear here. Send one first to get the loop started."
      ctaLabel="Make a puzzle"
      onCta={onNavigate}
    />
  );
}

export function EmptyCraftSent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <EmptyState
      icon={Send}
      headline="Send your first puzzle"
      description="Create a puzzle with your own words and send it to a friend. See how fast they can solve it."
      ctaLabel="Create a puzzle"
      onCta={onNavigate}
    />
  );
}

export function EmptyCraftDrafts({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <EmptyState
      icon={PenLine}
      headline="No drafts yet"
      description="Start building a puzzle and save it as a draft to finish later."
      ctaLabel="Start creating"
      onCta={onNavigate}
      compact
    />
  );
}

export function EmptyStats({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <EmptyState
      icon={BarChart2}
      headline="Your stats will appear here"
      description="Solve puzzles to build your rating, unlock skill tiers, and track your personal bests."
      ctaLabel="Play your first puzzle"
      onCta={onNavigate}
    />
  );
}

export function EmptyLeaderboard({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <EmptyState
      icon={Trophy}
      headline="Sign in to join the leaderboard"
      description="Your rating and rank are tracked globally. Sign in to see where you stand."
      ctaLabel="Sign in"
      onCta={onNavigate}
    />
  );
}

export function EmptyPuzzleType({
  typeName,
  onPlay,
}: {
  typeName: string;
  onPlay?: () => void;
}) {
  return (
    <EmptyState
      icon={Star}
      headline={`You haven't played ${typeName} yet`}
      description="Start with Easy to get a feel for it. Your best time and accuracy will appear here."
      ctaLabel={`Try ${typeName}`}
      onCta={onPlay}
      compact
    />
  );
}
