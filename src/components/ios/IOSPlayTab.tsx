import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Dices, SlidersHorizontal, Infinity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORY_INFO, type PuzzleCategory } from "@/lib/puzzleTypes";
import { randomSeed } from "@/lib/seededRandom";
import IOSCustomizeSheet from "./IOSCustomizeSheet";
import { getTodaysChallenge, getDailyCompletion } from "@/lib/dailyChallenge";
import { formatTime } from "@/hooks/usePuzzleTimer";

const categories = Object.entries(CATEGORY_INFO) as [PuzzleCategory, (typeof CATEGORY_INFO)[PuzzleCategory]][];

const IOSPlayTab = () => {
  const navigate = useNavigate();
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const challenge = useMemo(() => getTodaysChallenge(), []);
  const dailyCompletion = useMemo(() => getDailyCompletion(challenge.dateStr), [challenge.dateStr]);

  const handleSurprise = () => navigate("/surprise");

  const handleQuickPlay = (type: PuzzleCategory) => {
    const seed = randomSeed();
    navigate(`/quick-play/${type}?seed=${seed}&d=medium`);
  };

  return (
    <div className="space-y-5 px-5 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-lg font-bold text-foreground">Puzzlecraft</h1>
        <Link to={`/quick-play/sudoku?mode=endless`} className="text-xs font-medium text-primary flex items-center gap-1">
          <Infinity size={13} /> Endless
        </Link>
      </div>

      <Button
        onClick={handleSurprise}
        size="lg"
        className="w-full text-base font-semibold gap-2 h-12 rounded-xl"
      >
        <Dices size={18} />
        Surprise Me
      </Button>

      {/* Daily — subdued, single-line */}
      <Link
        to="/daily"
        className="flex items-center justify-between rounded-xl border bg-card/60 px-4 py-3 transition-colors active:bg-secondary/50"
      >
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground">Daily Challenge</p>
          <p className="text-sm font-semibold text-foreground truncate mt-0.5">
            {CATEGORY_INFO[challenge.category]?.name}
          </p>
        </div>
        {dailyCompletion ? (
          <span className="text-[11px] text-muted-foreground shrink-0">
            {formatTime(dailyCompletion.time)}
          </span>
        ) : (
          <span className="text-[11px] text-primary font-medium shrink-0">Play →</span>
        )}
      </Link>

      {/* Puzzle types — text only */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">Choose a Puzzle</h2>
        <div className="grid grid-cols-2 gap-2">
          {categories.map(([type, info]) => (
            <button
              key={type}
              onClick={() => handleQuickPlay(type)}
              className="rounded-xl border bg-card px-4 py-3 text-left transition-all active:scale-[0.97] active:bg-secondary/50"
            >
              <p className="text-sm font-semibold text-foreground leading-tight">{info.name}</p>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => setCustomizeOpen(true)}
        className="w-full flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground py-2.5 rounded-xl border border-dashed transition-colors active:bg-secondary/50"
      >
        <SlidersHorizontal size={14} />
        Customize
      </button>

      <IOSCustomizeSheet open={customizeOpen} onClose={() => setCustomizeOpen(false)} />
    </div>
  );
};

export default IOSPlayTab;
