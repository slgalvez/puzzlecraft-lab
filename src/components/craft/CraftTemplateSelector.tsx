import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { hapticTap } from "@/lib/haptic";
import {
  getTemplatesForType,
  type CraftTemplate,
} from "@/lib/craftTemplates";

interface CraftTemplateSelectorProps {
  puzzleType: "crossword" | "word-search" | "word-fill" | "cryptogram";
  onSelect: (template: CraftTemplate) => void;
}

export function CraftTemplateSelector({
  puzzleType,
  onSelect,
}: CraftTemplateSelectorProps) {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const templates = getTemplatesForType(puzzleType);
  const themed = templates.filter((t) => t.id !== "custom");
  const scratch = templates.find((t) => t.id === "custom");

  const handleSelect = (template: CraftTemplate) => {
    hapticTap();
    setSelected(template.id);
    onSelect(template);
    setExpanded(false);
  };

  return (
    <div className="mb-4">
      <button
        onClick={() => { hapticTap(); setExpanded((v) => !v); }}
        className="w-full flex items-center justify-between rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 transition-colors active:bg-muted/50"
      >
        <div className="text-left">
          <p className="text-sm font-medium text-foreground">
            {selected
              ? `Template: ${templates.find((t) => t.id === selected)?.label ?? "Custom"}`
              : "Start from a template"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {selected ? "Tap to change" : "Pre-filled words to customize"}
          </p>
        </div>
        {expanded
          ? <ChevronUp size={16} className="text-muted-foreground shrink-0" />
          : <ChevronDown size={16} className="text-muted-foreground shrink-0" />
        }
      </button>

      {expanded && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {themed.map((template) => (
            <button
              key={template.id}
              onClick={() => handleSelect(template)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-2xl border p-3.5",
                "text-left transition-all duration-150 active:scale-[0.97]",
                selected === template.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/40"
              )}
            >
              <span className="text-xl leading-none">{template.emoji}</span>
              <p className="text-sm font-semibold text-foreground leading-tight mt-1">
                {template.label}
              </p>
              <p className="text-[10px] text-muted-foreground leading-snug">
                {template.description}
              </p>
              {template.words.length > 0 && (
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  {template.words.length} words included
                </p>
              )}
            </button>
          ))}

          {scratch && (
            <button
              onClick={() => handleSelect(scratch)}
              className={cn(
                "col-span-2 flex items-center gap-3 rounded-2xl border p-3.5",
                "transition-all duration-150 active:scale-[0.97]",
                selected === scratch.id
                  ? "border-primary bg-primary/10"
                  : "border-border/50 bg-muted/20 hover:border-border"
              )}
            >
              <span className="text-xl">{scratch.emoji}</span>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">{scratch.label}</p>
                <p className="text-[11px] text-muted-foreground">{scratch.description}</p>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
