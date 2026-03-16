import { Button } from "@/components/ui/button";
import { RotateCcw, CheckCircle2, Shuffle } from "lucide-react";

interface Props {
  onReset: () => void;
  onCheck: () => void;
  onNewPuzzle: () => void;
}

const PuzzleControls = ({ onReset, onCheck, onNewPuzzle }: Props) => (
  <div className="flex flex-wrap gap-3 mt-6">
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
);

export default PuzzleControls;
