import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = "type" | "content" | "preview";

const STEPS: { key: Step; label: string }[] = [
  { key: "type", label: "Choose" },
  { key: "content", label: "Create" },
  { key: "preview", label: "Share" },
];

const stepIndex = (s: Step) => STEPS.findIndex(x => x.key === s);

export default function CraftStepper({ current }: { current: Step }) {
  const ci = stepIndex(current);

  return (
    <div className="flex items-center justify-center gap-1 mb-8">
      {STEPS.map((s, i) => {
        const done = i < ci;
        const active = i === ci;
        return (
          <div key={s.key} className="flex items-center gap-1">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-medium transition-all duration-300",
                  done && "bg-primary text-primary-foreground",
                  active && "bg-primary/15 text-primary ring-2 ring-primary/30",
                  !done && !active && "bg-muted text-muted-foreground"
                )}
              >
                {done ? <Check size={13} strokeWidth={2.5} /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors duration-200",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-px w-8 sm:w-12 mb-4 transition-colors duration-300",
                  i < ci ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
