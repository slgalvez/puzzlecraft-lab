import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface GroupedEntryListProps {
  entries: string[];
  isNumbers?: boolean;
  /** Interactive mode: entries can be toggled as "used" */
  interactive?: boolean;
  usedEntries?: Set<string>;
  onToggle?: (entry: string) => void;
  /** Read-only badge mode (for PuzzlePreview) */
  badgeMode?: boolean;
  className?: string;
}

/**
 * Groups fill-in puzzle entries by character length and renders them
 * in sorted sections with small headers (e.g. "3 Letters", "4 Digits").
 */
const GroupedEntryList = ({
  entries,
  isNumbers = false,
  interactive = false,
  usedEntries,
  onToggle,
  badgeMode = false,
  className,
}: GroupedEntryListProps) => {
  const groups = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const entry of entries) {
      const len = entry.length;
      if (!map.has(len)) map.set(len, []);
      map.get(len)!.push(entry);
    }
    // Sort each group
    for (const [, list] of map) {
      if (isNumbers) {
        list.sort((a, b) => Number(a) - Number(b));
      } else {
        list.sort((a, b) => a.localeCompare(b));
      }
    }
    // Return sorted by length ascending
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [entries, isNumbers]);

  const unit = isNumbers ? "Digit" : "Letter";

  if (groups.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {groups.map(([len, items]) => (
        <div key={len}>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {len} {unit}{len !== 1 ? "s" : ""}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {items.map((entry) =>
              badgeMode ? (
                <Badge key={entry} variant="outline" className="text-xs font-mono">
                  {entry}
                </Badge>
              ) : interactive && onToggle ? (
                <button
                  key={entry}
                  onClick={() => onToggle(entry)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors touch-manipulation",
                    usedEntries?.has(entry)
                      ? "border-primary/30 bg-primary/10 text-primary line-through"
                      : "border-border bg-card text-foreground hover:bg-secondary"
                  )}
                >
                  {entry}
                </button>
              ) : (
                <span
                  key={entry}
                  className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground"
                >
                  {entry}
                </span>
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default GroupedEntryList;
