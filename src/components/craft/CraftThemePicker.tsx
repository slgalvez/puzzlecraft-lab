/**
 * CraftThemePicker.tsx  ← FULL REPLACEMENT
 * src/components/craft/CraftThemePicker.tsx
 *
 * Unified theme + word pre-fill picker.
 *
 * Previously the app had two separate components doing overlapping jobs:
 *   - CraftTemplateSelector  → pre-filled words by occasion
 *   - CraftThemePicker       → set emoji/accent + reveal templates + word suggestions
 *
 * Both surfaced "Birthday", "Anniversary" etc. in different UIs.
 * This version merges them. One clear section, one clear purpose:
 *
 *   "Pick an occasion" → sets the visual theme AND offers to pre-fill words
 *
 * CraftTemplateSelector can be removed from CraftPuzzle.tsx entirely.
 * Replace all usage of CraftTemplateSelector with this component.
 */

import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles, Wand2 } from "lucide-react";
import { CRAFT_THEMES, type CraftTheme } from "@/lib/craftThemes";
import { cn } from "@/lib/utils";

interface Props {
  selected: string;
  onSelect: (themeId: string) => void;
  /** Called when user picks a reveal message template */
  onRevealTemplate?: (template: string) => void;
  /**
   * Called when user pre-fills words from theme suggestions.
   * Replaces the old CraftTemplateSelector onSelect callback.
   * Receives a newline-joined string of words.
   */
  onPrefillWords?: (words: string) => void;
  currentRevealMessage: string;
  /** Show the word pre-fill section (true for word-fill and word-search) */
  showWordSection?: boolean;
}

export default function CraftThemePicker({
  selected,
  onSelect,
  onRevealTemplate,
  onPrefillWords,
  currentRevealMessage,
  showWordSection = false,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [usedTemplate, setUsedTemplate] = useState<string | null>(null);
  const [wordsFilled, setWordsFilled] = useState(false);

  const selectedTheme = CRAFT_THEMES.find((t) => t.id === selected) ?? CRAFT_THEMES[0];
  const isNone = selected === "none";

  const handleSelect = (theme: CraftTheme) => {
    onSelect(theme.id);
    setWordsFilled(false);
    if (theme.id === "none") setExpanded(false);
  };

  const handleTemplate = (template: string) => {
    onRevealTemplate?.(template);
    setUsedTemplate(template);
    setTimeout(() => setUsedTemplate(null), 2000);
  };

  const handlePrefillAll = () => {
    if (!selectedTheme.wordSuggestions.length) return;
    onPrefillWords?.(selectedTheme.wordSuggestions.join("\n"));
    setWordsFilled(true);
    setTimeout(() => setWordsFilled(false), 2000);
  };

  const handlePrefillOne = (word: string) => {
    onPrefillWords?.(word);
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">
        Occasion (optional)
      </p>

      {/* Theme grid */}
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
        {CRAFT_THEMES.map((theme) => {
          const isSelected = selected === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => handleSelect(theme)}
              title={theme.label}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl py-2.5 px-1 transition-all duration-150 active:scale-95",
                isSelected
                  ? "bg-primary/10 ring-2 ring-primary/30"
                  : "bg-secondary/50 hover:bg-secondary"
              )}
            >
              <span className="text-xl leading-none" role="img" aria-label={theme.label}>
                {theme.emoji}
              </span>
              <span className={cn(
                "text-[9px] font-medium leading-tight text-center truncate w-full px-0.5",
                isSelected ? "text-primary" : "text-muted-foreground"
              )}>
                {theme.id === "none" ? "None" : theme.label.split(" ")[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Expanded helpers — only when a real theme is selected */}
      {!isNone && (
        <div className="rounded-xl border border-primary/15 bg-primary/5 overflow-hidden">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-left"
          >
            <span className="text-[11px] font-medium text-foreground">
              {selectedTheme.emoji} {selectedTheme.label}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">
                {expanded ? "Close" : "Messages & words"}
              </span>
              {expanded
                ? <ChevronUp size={12} className="text-muted-foreground" />
                : <ChevronDown size={12} className="text-muted-foreground" />
              }
            </div>
          </button>

          {expanded && (
            <div className="px-4 pb-4 space-y-4 border-t border-primary/10">

              {/* ── Reveal message templates ── */}
              {selectedTheme.revealTemplates.length > 0 && (
                <div className="space-y-2 pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Reveal message
                  </p>
                  <div className="space-y-1.5">
                    {selectedTheme.revealTemplates.map((tmpl, i) => {
                      const isUsed = usedTemplate === tmpl;
                      const isCurrent = currentRevealMessage === tmpl;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleTemplate(tmpl)}
                          className={cn(
                            "w-full text-left text-[11px] px-3 py-2 rounded-lg transition-all duration-150",
                            isCurrent
                              ? "bg-primary/15 text-primary font-medium"
                              : isUsed
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-card border border-border hover:border-primary/30 hover:bg-primary/5 text-foreground/80"
                          )}
                        >
                          {isUsed ? "✓ Added to reveal message" : tmpl}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Word pre-fill (replaces CraftTemplateSelector) ── */}
              {showWordSection && selectedTheme.wordSuggestions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      Pre-fill words
                    </p>
                    <button
                      type="button"
                      onClick={handlePrefillAll}
                      className="flex items-center gap-1 text-[10px] text-primary font-medium hover:text-primary/80 transition-colors"
                    >
                      {wordsFilled ? (
                        <span className="text-emerald-600">✓ Words filled in</span>
                      ) : (
                        <>
                          <Wand2 size={10} />
                          Use all {selectedTheme.wordSuggestions.length} words
                        </>
                      )}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTheme.wordSuggestions.map((word) => (
                      <button
                        key={word}
                        type="button"
                        onClick={() => handlePrefillOne(word)}
                        className="px-2 py-1 text-[10px] font-mono rounded-md bg-card border border-border hover:border-primary/30 hover:bg-primary/5 text-foreground/70 hover:text-primary transition-all"
                      >
                        {word}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground/50">
                    Tap a word to add it individually, or use all to pre-fill your word list
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
