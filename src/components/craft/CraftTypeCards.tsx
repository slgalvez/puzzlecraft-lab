import { useState } from "react";
import PuzzleIcon from "@/components/puzzles/PuzzleIcon";
import { cn } from "@/lib/utils";

type CraftType = "word-fill" | "cryptogram" | "crossword" | "word-search";

// ── Type definitions ───────────────────────────────────────────────────────

interface TypeOption {
  value: CraftType;
  label: string;
  tagline: string;
  difficulty: "Easy" | "Medium" | "Tricky";
  accentClass: string;
  iconBg: string;
  hoverColor: string;
}

const TYPE_OPTIONS: TypeOption[] = [
  {
    value: "word-search",
    label: "Word Search",
    tagline: "Hide your words in a grid",
    difficulty: "Easy",
    accentClass: "hover:border-sky-400/40 hover:bg-sky-400/[0.03]",
    iconBg: "bg-sky-400/10 text-sky-500",
    hoverColor: "hsl(200 80% 60%)",
  },
  {
    value: "word-fill",
    label: "Word Fill-In",
    tagline: "Build a grid they have to solve",
    difficulty: "Medium",
    accentClass: "hover:border-emerald-400/40 hover:bg-emerald-400/[0.03]",
    iconBg: "bg-emerald-400/10 text-emerald-500",
    hoverColor: "hsl(142 60% 50%)",
  },
  {
    value: "crossword",
    label: "Crossword",
    tagline: "Write the clues, set the trap",
    difficulty: "Tricky",
    accentClass: "hover:border-primary/40 hover:bg-primary/[0.03]",
    iconBg: "bg-primary/10 text-primary",
    hoverColor: "hsl(32 80% 50%)",
  },
  {
    value: "cryptogram",
    label: "Cryptogram",
    tagline: "Turn a message into a cipher",
    difficulty: "Tricky",
    accentClass: "hover:border-violet-400/40 hover:bg-violet-400/[0.03]",
    iconBg: "bg-violet-400/10 text-violet-500",
    hoverColor: "hsl(260 60% 60%)",
  },
];

const DIFFICULTY_COLOR: Record<string, string> = {
  Easy:   "text-emerald-600 bg-emerald-500/10",
  Medium: "text-amber-600 bg-amber-500/10",
  Tricky: "text-violet-600 bg-violet-500/10",
};

export { TYPE_OPTIONS };

// ── Component ──────────────────────────────────────────────────────────────

export default function CraftTypeCards({ onSelect }: { onSelect: (type: CraftType) => void }) {
  const [hoveredType, setHoveredType] = useState<CraftType | null>(null);

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      <p className="text-xs text-muted-foreground mb-4">
        What kind of puzzle do you want to send?
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TYPE_OPTIONS.map((opt, i) => {
          const isHovered = hoveredType === opt.value;

          return (
            <button
              key={opt.value}
              onClick={() => onSelect(opt.value)}
              onMouseEnter={() => setHoveredType(opt.value)}
              onMouseLeave={() => setHoveredType(null)}
              style={{ animationDelay: `${i * 55}ms`, animationFillMode: "backwards" }}
              className={cn(
                "group relative text-left rounded-2xl border border-border bg-card",
                "transition-all duration-200 active:scale-[0.98] hover:shadow-sm overflow-hidden",
                opt.accentClass,
              )}
            >
              {/* Single vertically-centered content row: icon + label + difficulty + tagline */}
              <div className="flex items-center gap-3.5 px-4 py-4 min-h-[80px]">
                <div className={cn(
                  "h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200",
                  opt.iconBg,
                  isHovered && "scale-110",
                )}>
                  <PuzzleIcon type={opt.value} size={26} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-[15px] font-semibold text-foreground leading-tight">
                      {opt.label}
                    </span>
                    <span className={cn(
                      "text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
                      DIFFICULTY_COLOR[opt.difficulty],
                    )}>
                      {opt.difficulty}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">
                    {opt.tagline}
                  </p>
                </div>
              </div>

              {/* Subtle bottom accent line on hover — only hover affordance */}
              <div
                className={cn(
                  "absolute bottom-0 left-0 right-0 h-0.5 transition-opacity duration-200",
                  isHovered ? "opacity-60" : "opacity-0",
                )}
                style={{ background: opt.hoverColor }}
              />
            </button>
          );
        })}
      </div>

      <p className="text-center text-[11px] text-muted-foreground/50 mt-4">
        All types support a personal message revealed after solving
      </p>
    </div>
  );
}
