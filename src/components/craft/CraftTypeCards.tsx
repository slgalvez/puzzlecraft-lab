import { useState } from "react";
import PuzzleIcon from "@/components/puzzles/PuzzleIcon";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

type CraftType = "word-fill" | "cryptogram" | "crossword" | "word-search";

// ── Type definitions ───────────────────────────────────────────────────────

interface TypeOption {
  value: CraftType;
  label: string;
  tagline: string;        // one punchy line shown large
  youDo: string;          // what the creator does
  theyGet: string;        // what the recipient experiences
  exampleWords: string[]; // shown as small word chips
  difficulty: "Easy" | "Medium" | "Tricky";
  accentClass: string;    // border/bg accent on hover
  iconBg: string;
}

const TYPE_OPTIONS: TypeOption[] = [
  {
    value: "word-search",
    label: "Word Search",
    tagline: "Hide words in a grid",
    youDo: "Enter words from your life",
    theyGet: "Hunt for every one",
    exampleWords: ["NASHVILLE", "BIRTHDAY", "CHUCKY"],
    difficulty: "Easy",
    accentClass: "hover:border-sky-400/40 hover:bg-sky-400/[0.03]",
    iconBg: "bg-sky-400/10 text-sky-500",
  },
  {
    value: "word-fill",
    label: "Word Fill-In",
    tagline: "Build a grid from your words",
    youDo: "Give the words, set the grid",
    theyGet: "Place every word perfectly",
    exampleWords: ["VACATION", "BEACH", "SUMMER"],
    difficulty: "Medium",
    accentClass: "hover:border-emerald-400/40 hover:bg-emerald-400/[0.03]",
    iconBg: "bg-emerald-400/10 text-emerald-500",
  },
  {
    value: "crossword",
    label: "Crossword",
    tagline: "Write the clues, set the trap",
    youDo: "Write answers + clever clues",
    theyGet: "Decode every clue",
    exampleWords: ["LONDON", "PASSPORT", "AIRPORT"],
    difficulty: "Tricky",
    accentClass: "hover:border-primary/40 hover:bg-primary/[0.03]",
    iconBg: "bg-primary/10 text-primary",
  },
  {
    value: "cryptogram",
    label: "Cryptogram",
    tagline: "Turn a message into a cipher",
    youDo: "Write any phrase or message",
    theyGet: "Decode it letter by letter",
    exampleWords: ["MEET ME AT MIDNIGHT"],
    difficulty: "Tricky",
    accentClass: "hover:border-violet-400/40 hover:bg-violet-400/[0.03]",
    iconBg: "bg-violet-400/10 text-violet-500",
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
      <p className="text-xs text-muted-foreground mb-4">What kind of puzzle do you want to send?</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TYPE_OPTIONS.map((opt, i) => {
          const isHovered = hoveredType === opt.value;

          return (
            <button
              key={opt.value}
              onClick={() => onSelect(opt.value)}
              onMouseEnter={() => setHoveredType(opt.value)}
              onMouseLeave={() => setHoveredType(null)}
              className={cn(
                "group relative text-left rounded-2xl border border-border bg-card",
                "transition-all duration-200 active:scale-[0.98]",
                "hover:shadow-sm hover:border-opacity-100",
                opt.accentClass,
                "overflow-hidden"
              )}
              style={{
                animationDelay: `${i * 55}ms`,
                animationFillMode: "backwards",
              }}
            >
              {/* Top section: icon + label + difficulty */}
              <div className="px-4 pt-4 pb-3 flex items-start gap-3">
                {/* Icon in accent background */}
                <div className={cn(
                  "h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200",
                  opt.iconBg,
                  isHovered && "scale-110"
                )}>
                  <PuzzleIcon type={opt.value} size={26} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[15px] font-semibold text-foreground leading-tight">
                      {opt.label}
                    </span>
                    <span className={cn(
                      "text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
                      DIFFICULTY_COLOR[opt.difficulty]
                    )}>
                      {opt.difficulty}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">
                    {opt.tagline}
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="mx-4 h-px bg-border/60" />

              {/* Bottom section: you do / they get */}
              <div className="px-4 py-3 space-y-1.5">
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 w-14 shrink-0 mt-px">
                    You
                  </span>
                  <span className="text-[12px] text-foreground/80 leading-snug">
                    {opt.youDo}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 w-14 shrink-0 mt-px">
                    They
                  </span>
                  <span className="text-[12px] text-foreground/80 leading-snug">
                    {opt.theyGet}
                  </span>
                </div>
              </div>

              {/* Example words */}
              <div className="px-4 pb-4 flex items-center gap-1.5 flex-wrap">
                {opt.exampleWords.map((word) => (
                  <span
                    key={word}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary text-muted-foreground"
                  >
                    {word}
                  </span>
                ))}
                <span className="text-[10px] text-muted-foreground/40 ml-auto flex items-center gap-0.5">
                  Choose <ArrowRight size={10} />
                </span>
              </div>

              {/* Subtle bottom accent line on hover */}
              <div className={cn(
                "absolute bottom-0 left-0 right-0 h-0.5 transition-opacity duration-200",
                isHovered ? "opacity-100" : "opacity-0"
              )}
                style={{
                  background: opt.value === "word-search" ? "hsl(200 80% 60%)" :
                              opt.value === "word-fill"   ? "hsl(142 60% 50%)" :
                              opt.value === "crossword"   ? "hsl(32 80% 50%)"  :
                                                           "hsl(260 60% 60%)",
                }}
              />
            </button>
          );
        })}
      </div>

      {/* Helper text */}
      <p className="text-center text-[11px] text-muted-foreground/50 mt-4">
        All puzzle types can include a personal message revealed after solving
      </p>
    </div>
  );
}
