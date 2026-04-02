import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Dices, SlidersHorizontal, Flame, Trophy, Target, Clock, CheckCircle2, ArrowRight, Infinity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORY_INFO, type PuzzleCategory } from "@/lib/puzzleTypes";
import { randomSeed } from "@/lib/seededRandom";
import PuzzleIcon from "@/components/puzzles/PuzzleIcon";
import IOSCustomizeSheet from "./IOSCustomizeSheet";
import { getTodaysChallenge, getDailyCompletion, getDailyStreak } from "@/lib/dailyChallenge";
import { getProgressStats } from "@/lib/progressTracker";
import { formatTime } from "@/hooks/usePuzzleTimer";

const categories = Object.entries(CATEGORY_INFO) as [PuzzleCategory, (typeof CATEGORY_INFO)[PuzzleCategory]][];

const IOSPlayTab = () => {
  const navigate = useNavigate();
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const challenge = useMemo(() => getTodaysChallenge(), []);
  const dailyCompletion = useMemo(() => getDailyCompletion(challenge.dateStr), [challenge.dateStr]);
  const dailyStreak = useMemo(() => getDailyStreak(), []);
  const stats = useMemo(() => getProgressStats(), []);

  const handleSurprise = () => {
    navigate("/surprise");
  };

  const handleQuickPlay = (type: PuzzleCategory) => {
    const seed = randomSeed();
    navigate(`/quick-play/${type}?seed=${seed}&d=medium`);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div
        className="sticky top-0 z-40 bg-surface-elevated/90 backdrop-blur-md border-b"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="px-5 h-14 flex items-center">
          <h1 className="font-display text-xl font-bold text-foreground">Puzzlecraft</h1>
        </div>
      </div>

      <div className="px-5 pt-5 space-y-6">
        {/* Surprise Me — prominent */}
        <Button
          onClick={handleSurprise}
          size="lg"
          className="w-full text-base font-semibold gap-2 h-14 rounded-xl"
        >
          <Dices size={20} />
          Surprise Me
        </Button>

        {/* Daily Challenge compact card */}
        <Link
          to="/daily"
          className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors active:bg-secondary/50"
        >
          <div className="flex-1">
            <p className="text-[10px] font-medium uppercase tracking-widest text-primary">Daily Challenge</p>
            <p className="font-display text-base font-bold text-foreground mt-0.5">
              Today's {CATEGORY_INFO[challenge.category]?.name}
            </p>
            {dailyCompletion ? (
              <div className="flex items-center gap-1.5 mt-1">
                <CheckCircle2 size={12} className="text-primary" />
                <span className="text-xs text-muted-foreground">Solved in {formatTime(dailyCompletion.time)}</span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">Tap to play →</p>
            )}
          </div>
          <div className="flex gap-3">
            <div className="text-center">
              <Flame size={14} className="text-primary mx-auto" />
              <p className="font-mono text-lg font-bold text-foreground leading-none mt-1">{dailyStreak.current}</p>
              <p className="text-[9px] text-muted-foreground">streak</p>
            </div>
            <div className="text-center">
              <Trophy size={14} className="text-primary mx-auto" />
              <p className="font-mono text-lg font-bold text-foreground leading-none mt-1">{dailyStreak.longest}</p>
              <p className="text-[9px] text-muted-foreground">best</p>
            </div>
          </div>
        </Link>

        {/* Puzzle type grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-base font-semibold text-foreground">Choose a Puzzle</h2>
            <Link to={`/quick-play/sudoku?mode=endless`} className="text-xs font-medium text-primary flex items-center gap-1">
              <Infinity size={12} /> Endless
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {categories.map(([type, info]) => (
              <button
                key={type}
                onClick={() => handleQuickPlay(type)}
                className="flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-all active:scale-[0.97] active:bg-secondary/50"
              >
                <PuzzleIcon type={type} size={28} className="text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="font-display text-sm font-semibold text-foreground leading-tight truncate">{info.name}</p>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-1">{info.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Customize button */}
        <Button
          variant="outline"
          onClick={() => setCustomizeOpen(true)}
          className="w-full gap-2 h-12 rounded-xl"
        >
          <SlidersHorizontal size={16} />
          Customize
        </Button>

        {/* Quick stats */}
        {stats.totalSolved > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: Target, value: stats.totalSolved, label: "Solved" },
              { icon: Flame, value: stats.currentStreak, label: "Streak" },
              { icon: Clock, value: formatTime(stats.averageTime), label: "Avg" },
              { icon: Trophy, value: stats.bestTime !== null ? formatTime(stats.bestTime) : "—", label: "Best" },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="rounded-xl border bg-card p-3 text-center">
                <Icon size={14} className="text-primary mx-auto mb-1" />
                <p className="font-mono text-sm font-bold text-foreground">{value}</p>
                <p className="text-[9px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <IOSCustomizeSheet open={customizeOpen} onClose={() => setCustomizeOpen(false)} />
    </div>
  );
};

export default IOSPlayTab;
