/**
 * CraftSettingsPanel.tsx
 * 
 * Full difficulty range (Easy → Insane) matching standard gameplay.
 * Difficulty controls actual grid generation — not just UI.
 */

import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import type { Difficulty } from "@/lib/puzzleTypes";

export interface CraftSettings {
  difficulty: Difficulty;
  hintsEnabled: boolean;
  revealEnabled: boolean;
  checkEnabled: boolean;
}

export const DEFAULT_CRAFT_SETTINGS: CraftSettings = {
  difficulty: "medium",
  hintsEnabled: true,
  revealEnabled: false,
  checkEnabled: true,
};

const DIFFICULTY_OPTIONS: {
  value: Difficulty;
  label: string;
  desc: string;
}[] = [
  {
    value: "easy",
    label: "Easy",
    desc: "More spacing, fewer crossings — relaxed layout",
  },
  {
    value: "medium",
    label: "Medium",
    desc: "Balanced grid — good for most puzzles",
  },
  {
    value: "hard",
    label: "Hard",
    desc: "Dense grid, many crossings — a tighter challenge",
  },
  {
    value: "extreme",
    label: "Extreme",
    desc: "Very dense — heavy interlocking, large grids",
  },
  {
    value: "insane",
    label: "Insane",
    desc: "Maximum density — as tight as the generator allows",
  },
];

interface Props {
  value: CraftSettings;
  onChange: (s: CraftSettings) => void;
}

export default function CraftSettingsPanel({ value, onChange }: Props) {
  const set = <K extends keyof CraftSettings>(key: K, val: CraftSettings[K]) =>
    onChange({ ...value, [key]: val });

  const activeDiff = DIFFICULTY_OPTIONS.find((o) => o.value === value.difficulty)!;

  return (
    <div className="space-y-4 pt-1">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">
        Puzzle Settings
      </p>

      <div className="space-y-3">
        {/* Difficulty row */}
        <div className="grid grid-cols-[auto_1fr] gap-x-6 items-start">
          <span className="text-[11px] text-muted-foreground whitespace-nowrap pt-1.5">
            Layout
          </span>
          <div className="space-y-1.5">
            <div className="inline-flex flex-wrap rounded-full border border-border bg-muted/30 p-0.5 w-fit gap-0.5">
              {DIFFICULTY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => set("difficulty", opt.value)}
                  className={cn(
                    "px-3 py-1 rounded-full text-[11px] font-medium transition-colors",
                    value.difficulty === opt.value
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {/* Active difficulty description */}
            <p className="text-[10px] text-muted-foreground/60 pl-0.5">
              {activeDiff.desc}
            </p>
          </div>
        </div>

        {/* Solver tools row */}
        <div className="grid grid-cols-[auto_1fr] gap-x-6 items-center">
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
            Solver tools
          </span>
          <div className="flex items-center gap-4">
            <ToggleChip
              label="Hints"
              checked={value.hintsEnabled}
              onToggle={(v) => set("hintsEnabled", v)}
            />
            <ToggleChip
              label="Check"
              checked={value.checkEnabled}
              onToggle={(v) => set("checkEnabled", v)}
            />
            <ToggleChip
              label="Reveal"
              checked={value.revealEnabled}
              onToggle={(v) => set("revealEnabled", v)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleChip({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer select-none">
      <Switch
        checked={checked}
        onCheckedChange={onToggle}
        className="h-4 w-7 [&>span]:h-3 [&>span]:w-3 data-[state=checked]:[&>span]:translate-x-3"
      />
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </label>
  );
}
