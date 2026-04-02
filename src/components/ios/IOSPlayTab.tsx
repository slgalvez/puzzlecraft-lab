import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Dices, SlidersHorizontal, Flame, Trophy, CheckCircle2, Infinity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORY_INFO, type PuzzleCategory } from "@/lib/puzzleTypes";
import { randomSeed } from "@/lib/seededRandom";
import PuzzleIcon from "@/components/puzzles/PuzzleIcon";
import IOSCustomizeSheet from "./IOSCustomizeSheet";
import { getTodaysChallenge, getDailyCompletion, getDailyStreak } from "@/lib/dailyChallenge";
import { formatTime } from "@/hooks/usePuzzleTimer";

const categories = Object.entries(CATEGORY_INFO) as [PuzzleCategory, (typeof CATEGORY_INFO)[PuzzleCategory]][];

const IOSPlayTab = () => {
  const navigate = useNavigate();
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const challenge = useMemo(() => getTodaysChallenge(), []);
  const dailyCompletion = useMemo(() => getDailyCompletion(challenge.dateStr), [challenge.dateStr]);
  const dailyStreak = useMemo(() => getDailyStreak(), []);

  const handleSurprise = () => {
    navigate("/surprise");
  };

  const handleQuickPlay = (type: PuzzleCategory) => {
    const seed = randomSeed();
    navigate(`/quick-play/${type}?seed=${seed}&d=medium`);
  };

  return (
    <div className="flex flex-col min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-background">
      {/* Header */}
      <div
        className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="px-5 h-12 flex items-center justify-between">
          <h1 className="font-display text-lg font-bold text-foreground">Puzzlecraft</h1>
          <Link to={`/quick-play/sudoku?mode=endless`} className="text-xs font-medium text-primary flex items-center gap-1">
            <Infinity size={13} /> Endless
          </Link>
        </div>
      </div>

      <div className="px-5 pt-4 pb-24 space-y-5">
        {/* Surprise Me */}
        <Button
          onClick={handleSurprise}
          size="lg"
          className="w-full text-base font-semibold gap-2 h-12 rounded-xl"
        >
          <Dices size={18} />
          Surprise Me
        </Button>

        {/* Daily Challenge */}
        <Link
          to="/daily"
          className="flex items-center gap-4 rounded-xl border bg-card p-3.5 transition-colors active:bg-secondary/50"
        >
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-widest text-primary">Daily Challenge</p>
            <p className="font-display text-sm font-bold text-foreground mt-0.5 truncate">
              Today's {CATEGORY_INFO[challenge.category]?.name}
            </p>
            {dailyCompletion ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 size={11} className="text-primary shrink-0" />
                <span className="text-[11px] text-muted-foreground">Solved in {formatTime(dailyCompletion.time)}</span>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground mt-0.5">Tap to play</p>
            )}
          </div>
          <div className="flex gap-3 shrink-0">
            <div className="text-center">
              <Flame size={13} className="text-primary mx-auto" />
              <p className="font-mono text-base font-bold text-foreground leading-none mt-0.5">{dailyStreak.current}</p>
              <p className="text-[8px] text-muted-foreground">streak</p>
            </div>
            <div className="text-center">
              <Trophy size={13} className="text-primary mx-auto" />
              <p className="font-mono text-base font-bold text-foreground leading-none mt-0.5">{dailyStreak.longest}</p>
              <p className="text-[8px] text-muted-foreground">best</p>
            </div>
          </div>
        </Link>

        {/* Puzzle types */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">Choose a Puzzle</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {categories.map(([type, info]) => (
              <button
                key={type}
                onClick={() => handleQuickPlay(type)}
                className="flex items-center gap-2.5 rounded-xl border bg-card p-3 text-left transition-all active:scale-[0.97] active:bg-secondary/50"
              >
                <PuzzleIcon type={type} size={24} className="text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight truncate">{info.name}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Customize */}
        <button
          onClick={() => setCustomizeOpen(true)}
          className="w-full flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground py-2.5 rounded-xl border border-dashed transition-colors active:bg-secondary/50"
        >
          <SlidersHorizontal size={14} />
          Customize
        </button>
      </div>

      <IOSCustomizeSheet open={customizeOpen} onClose={() => setCustomizeOpen(false)} />
    </div>
  );
};

export default IOSPlayTab;
