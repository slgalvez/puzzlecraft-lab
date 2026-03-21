import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, X, Play, Clock } from "lucide-react";
import { getSavedPuzzles, unsavePuzzle, getSavedPuzzleProgress, type SavedPuzzle } from "@/lib/savedPuzzles";
import { CATEGORY_INFO, DIFFICULTY_LABELS } from "@/lib/puzzleTypes";
import PuzzleIcon from "./PuzzleIcon";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatTime } from "@/hooks/usePuzzleTimer";
import { formatDistanceToNow } from "date-fns";

const SavedPuzzlesSection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [puzzles, setPuzzles] = useState(() => getSavedPuzzles());

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

  const handleResume = (p: SavedPuzzle) => {
    navigate(`/quick-play/${p.category}?seed=${p.seed}&d=${p.difficulty}`);
  };

  const handleRemove = (id: string) => {
    unsavePuzzle(id);
    setPuzzles(getSavedPuzzles());
    toast({ title: "Removed from saved" });
  };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Bookmark size={14} className="text-muted-foreground" />
        <h2 className="text-sm font-medium text-muted-foreground">
          Saved Puzzles ({enriched.length})
        </h2>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {enriched.map((p) => (
          <div
            key={p.id}
            className="group relative flex-shrink-0 w-52 rounded-lg border bg-card p-3 transition-colors hover:border-primary/40"
          >
            {/* Remove button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(p.id);
              }}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-full p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Remove"
            >
              <X size={12} />
            </button>

            {/* Puzzle info */}
            <div className="flex items-center gap-2 mb-2">
              <PuzzleIcon type={p.category} size={18} className="text-foreground/70" />
              <span className="text-xs font-semibold text-foreground truncate">
                {p.info.name}
              </span>
            </div>

            {/* Difficulty + time */}
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-2">
              <span className="rounded-full bg-secondary px-1.5 py-px capitalize">
                {DIFFICULTY_LABELS[p.difficulty]}
              </span>
              {p.progress.hasProgress && (
                <span className="flex items-center gap-0.5">
                  <Clock size={10} />
                  {formatTime(p.progress.elapsed)}
                </span>
              )}
            </div>

            {/* Last saved */}
            <p className="text-[10px] text-muted-foreground/60 mb-2">
              {formatDistanceToNow(new Date(p.savedAt), { addSuffix: true })}
            </p>

            {/* Resume button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-full text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10"
              onClick={() => handleResume(p)}
            >
              <Play size={10} />
              Resume
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SavedPuzzlesSection;
