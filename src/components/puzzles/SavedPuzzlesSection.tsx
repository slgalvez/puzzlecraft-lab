import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, X, Play, Clock } from "lucide-react";
import { getSavedPuzzles, unsavePuzzle, getSavedPuzzleProgress, type SavedPuzzle } from "@/lib/savedPuzzles";
import { CATEGORY_INFO, DIFFICULTY_LABELS } from "@/lib/puzzleTypes";
import PuzzleIcon from "./PuzzleIcon";
import { useToast } from "@/hooks/use-toast";
import { formatTime } from "@/hooks/usePuzzleTimer";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const SESSION_KEY = "puzzlecraft-saved-expanded";

const SavedPuzzlesSection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [puzzles, setPuzzles] = useState(() => getSavedPuzzles());
  const [expanded, setExpanded] = useState(() => {
    try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return false; }
  });

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      try { sessionStorage.setItem(SESSION_KEY, next ? "1" : "0"); } catch {}
      return next;
    });
  }, []);

  const enriched = useMemo(
    () =>
      puzzles.map((p) => ({
        ...p,
        progress: getSavedPuzzleProgress(p),
        info: CATEGORY_INFO[p.category],
      })),
    [puzzles]
  );

  if (enriched.length === 0) return null;

  const visible = enriched.slice(0, 3);

  const handleResume = (p: SavedPuzzle) => {
    navigate(`/quick-play/${p.category}?seed=${p.seed}&d=${p.difficulty}`);
  };

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    unsavePuzzle(id);
    setPuzzles(getSavedPuzzles());
    toast({ title: "Removed from saved" });
  };

  return (
    <div className="mb-6">
      {/* Collapsed header row */}
      <button
        onClick={toggleExpanded}
        className="flex w-full items-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ChevronRight
          size={14}
          className={cn(
            "transition-transform duration-200 shrink-0",
            expanded && "rotate-90"
          )}
        />
        <span className="font-medium">
          Continue where you left off
          <span className="ml-1 text-muted-foreground/60">({enriched.length})</span>
        </span>
      </button>

      {/* Expanded content */}
      <div
        className={cn(
          "grid transition-all duration-200 ease-out",
          expanded ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-1">
            {visible.map((p) => (
              <div
                key={p.id}
                className="group flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50 transition-colors"
              >
                <PuzzleIcon type={p.category} size={16} className="text-muted-foreground shrink-0" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground truncate">
                      {p.info.name}
                    </span>
                    <span className="rounded-full bg-secondary px-1.5 py-px text-[10px] text-muted-foreground capitalize">
                      {DIFFICULTY_LABELS[p.difficulty]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 mt-0.5">
                    {p.progress.hasProgress && (
                      <span className="flex items-center gap-0.5">
                        <Clock size={9} />
                        {formatTime(p.progress.elapsed)}
                      </span>
                    )}
                    <span>{formatDistanceToNow(new Date(p.savedAt), { addSuffix: true })}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleResume(p)}
                  className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors shrink-0"
                >
                  Resume
                </button>

                <button
                  onClick={(e) => handleRemove(p.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-foreground transition-opacity shrink-0"
                  aria-label="Remove"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SavedPuzzlesSection;
