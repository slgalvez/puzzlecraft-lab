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

const DIFFICULTY_OPTIONS: { value: CraftSettings["difficulty"]; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

interface Props {
  value: CraftSettings;
  onChange: (s: CraftSettings) => void;
}

export default function CraftSettingsPanel({ value, onChange }: Props) {
  const set = <K extends keyof CraftSettings>(key: K, val: CraftSettings[K]) =>
    onChange({ ...value, [key]: val });

  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">
        Puzzle Settings
      </p>

      {/* Difficulty pills */}
      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground">Difficulty</label>
        <div className="inline-flex rounded-full border border-border bg-muted/30 p-0.5">
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
      </div>

      {/* Toggle row */}
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        <ToggleChip label="Hints" checked={value.hintsEnabled} onToggle={(v) => set("hintsEnabled", v)} />
        <ToggleChip label="Check" checked={value.checkEnabled} onToggle={(v) => set("checkEnabled", v)} />
        <ToggleChip label="Reveal" checked={value.revealEnabled} onToggle={(v) => set("revealEnabled", v)} />
      </div>
    </div>
  );
}

function ToggleChip({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: (v: boolean) => void }) {
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
