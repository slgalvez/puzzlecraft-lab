import { Button } from "@/components/ui/button";
import { RotateCcw, CheckCircle2, Shuffle, ChevronDown } from "lucide-react";
import { useState } from "react";

interface Props {
  onReset: () => void;
  onCheck: () => void;
  onNewPuzzle: () => void;
  puzzleCode?: string;
}

const PuzzleControls = ({ onReset, onCheck, onNewPuzzle, puzzleCode }: Props) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-6 space-y-2">
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" size="sm" onClick={onReset}>
          <RotateCcw className="mr-1.5 h-4 w-4" /> Reset
        </Button>
        <Button variant="outline" size="sm" onClick={onCheck}>
          <CheckCircle2 className="mr-1.5 h-4 w-4" /> Check Solution
        </Button>
        <Button size="sm" onClick={onNewPuzzle}>
          <Shuffle className="mr-1.5 h-4 w-4" /> New Puzzle
        </Button>
      </div>
      {puzzleCode && (
        <details
          className="text-xs text-muted-foreground"
          open={open}
          onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
        >
          <summary className="cursor-pointer hover:text-foreground transition-colors select-none w-fit">
            Advanced
          </summary>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-muted-foreground">Puzzle code:</span>
            <code className="rounded bg-muted px-2 py-0.5 font-mono text-foreground select-all">
              {puzzleCode}
            </code>
          </div>
        </details>
      )}
    </div>
  );
};

export default PuzzleControls;
