import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

export interface CraftSettings {
  difficulty: "easy" | "medium" | "hard";
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

interface DifficultyOption {
  value: CraftSettings["difficulty"];
  label: string;
  desc: string;
  hoverClass: string;     // matches CraftTypeCards accent style
  selectedClass: string;  // soft-fill selected state
  accentLine: string;     // hsl color for hover bottom line
}

const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  {
    value: "easy",
    label: "Easy",
    desc: "Relaxed layout, fewer crossings",
    hoverClass: "hover:border-emerald-400/40 hover:bg-emerald-400/[0.03]",
    selectedClass: "border-emerald-500/60 bg-emerald-500/10",
    accentLine: "hsl(142 60% 50%)",
  },
  {
    value: "medium",
    label: "Medium",
    desc: "Balanced grid for most puzzles",
    hoverClass: "hover:border-amber-400/40 hover:bg-amber-400/[0.03]",
    selectedClass: "border-amber-500/60 bg-amber-500/10",
    accentLine: "hsl(38 92% 50%)",
  },
  {
    value: "hard",
    label: "Hard",
    desc: "Dense grid, tighter challenge",
    hoverClass: "hover:border-rose-400/40 hover:bg-rose-400/[0.03]",
    selectedClass: "border-rose-500/60 bg-rose-500/10",
    accentLine: "hsl(346 77% 55%)",
  },
];

interface Props {
  value: CraftSettings;
  onChange: (s: CraftSettings) => void;
}

export default function CraftSettingsPanel({ value, onChange }: Props) {
  const set = <K extends keyof CraftSettings>(key: K, val: CraftSettings[K]) =>
    onChange({ ...value, [key]: val });

  return (
    <div className="space-y-4 pt-1">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">
        Puzzle Settings
      </p>

      {/* Difficulty cards — matches CraftTypeCards visual language */}
      <div className="space-y-2">
        <p className="text-[11px] text-muted-foreground">Layout difficulty</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {DIFFICULTY_OPTIONS.map((opt) => {
            const isSelected = value.difficulty === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => set("difficulty", opt.value)}
                className={cn(
                  "group relative text-left rounded-2xl border bg-card",
                  "transition-all duration-200 active:scale-[0.98]",
                  "overflow-hidden",
                  isSelected
                    ? opt.selectedClass
                    : cn("border-border", opt.hoverClass, "hover:shadow-sm")
                )}
              >
                <div className="flex flex-col justify-center px-3 py-3 min-h-[64px]">
                  <span className="text-[13px] font-semibold text-foreground leading-tight mb-0.5">
                    {opt.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground leading-snug">
                    {opt.desc}
                  </span>
                </div>

                {/* Subtle bottom accent line on hover (hidden when selected) */}
                {!isSelected && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-60 transition-opacity duration-200"
                    style={{ background: opt.accentLine }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Solver tools */}
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
