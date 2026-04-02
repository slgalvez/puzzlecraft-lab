import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Dices, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORY_INFO, type PuzzleCategory } from "@/lib/puzzleTypes";
import { randomSeed } from "@/lib/seededRandom";
import IOSCustomizeSheet from "./IOSCustomizeSheet";
import { getTodaysChallenge, getDailyCompletion } from "@/lib/dailyChallenge";
import { formatTime } from "@/hooks/usePuzzleTimer";
import { hapticTap } from "@/lib/haptic";

const categories = Object.entries(CATEGORY_INFO) as [PuzzleCategory, (typeof CATEGORY_INFO)[PuzzleCategory]][];

const DAILY_TAGLINES = [
  "Can you solve it without hints?",
  "A tricky one today",
  "Test your logic",
  "Think fast, solve faster",
  "How quick can you go?",
  "No hints. No mercy.",
  "Ready for a challenge?",
];

function getDailyTagline(dateStr: string): string {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) | 0;
  }
  return DAILY_TAGLINES[Math.abs(hash) % DAILY_TAGLINES.length];
}

const TYPE_SUBTITLES: Record<PuzzleCategory, string> = {
  crossword: "Classic clue-based word grid",
  "word-fill": "Place words into the pattern",
  "number-fill": "Fit numbers into the grid",
  sudoku: "Fill the 9×9 grid with logic",
  "word-search": "Find hidden words",
  kakuro: "Number crossword with sums",
  nonogram: "Reveal a picture with clues",
  cryptogram: "Decode the secret message",
};

const IOSPlayTab = () => {
  const navigate = useNavigate();
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const challenge = useMemo(() => getTodaysChallenge(), []);
  const dailyCompletion = useMemo(() => getDailyCompletion(challenge.dateStr), [challenge.dateStr]);
  const tagline = useMemo(() => getDailyTagline(challenge.dateStr), [challenge.dateStr]);

  const handleSurprise = () => {
    hapticTap();
    navigate("/surprise");
  };

  const handleQuickPlay = (type: PuzzleCategory) => {
    hapticTap();
    const seed = randomSeed();
    navigate(`/quick-play/${type}?seed=${seed}&d=medium`);
  };

  return (
    <div className="space-y-5 px-5 pt-4">
      <h1 className="font-display text-lg font-bold text-foreground">Puzzlecraft</h1>

      {/* Surprise Me — primary action with glow + tap animation */}
      <Button
        onClick={handleSurprise}
        size="lg"
        className="w-full text-base font-semibold gap-2 h-12 rounded-xl shadow-[0_0_16px_hsl(var(--primary)/0.35)] active:scale-95 transition-transform duration-150"
      >
        <Dices size={18} className="animate-pulse" />
        Surprise Me
      </Button>

      {/* Daily Challenge — elevated card */}
      <Link
        to="/daily"
        className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-4 transition-all active:scale-[0.97] active:bg-primary/10"
      >
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Daily Challenge</p>
          <p className="text-sm font-bold text-foreground truncate mt-1">
            {CATEGORY_INFO[challenge.category]?.name}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 italic">{tagline}</p>
        </div>
        {dailyCompletion ? (
          <span className="text-xs font-medium text-muted-foreground shrink-0">
            {formatTime(dailyCompletion.time)}
          </span>
        ) : (
          <span className="text-xs text-primary font-semibold shrink-0">Play →</span>
        )}
      </Link>

      {/* Puzzle types */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">Choose a Puzzle</h2>
        <div className="grid grid-cols-2 gap-2">
          {categories.map(([type, info]) => (
            <button
              key={type}
              onClick={() => handleQuickPlay(type)}
              className="rounded-xl border bg-card px-4 py-3 text-left transition-all duration-150 active:scale-[0.95] active:shadow-md active:border-primary/30"
            >
              <p className="text-sm font-semibold text-foreground leading-tight">{info.name}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{TYPE_SUBTITLES[type]}</p>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => { hapticTap(); setCustomizeOpen(true); }}
        className="w-full flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground py-2.5 rounded-xl border border-dashed transition-all duration-150 active:scale-[0.97] active:bg-secondary/50"
      >
        <SlidersHorizontal size={14} />
        Customize
      </button>

      <IOSCustomizeSheet open={customizeOpen} onClose={() => setCustomizeOpen(false)} />
    </div>
  );
};

export default IOSPlayTab;
