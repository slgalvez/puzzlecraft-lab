import { useState, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PartyPopper } from "lucide-react";
import {
  GridSolver,
  CryptogramSolver,
  WordSearchSolver,
} from "@/components/private/PrivatePuzzleSolvers";

type CraftType = "word-fill" | "cryptogram" | "crossword" | "word-search";

interface CraftPayload {
  type: CraftType;
  puzzleData: Record<string, unknown>;
  revealMessage: string;
}

function decodeShareData(encoded: string): CraftPayload | null {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    const parsed = JSON.parse(json);
    if (parsed.type && parsed.puzzleData) return parsed as CraftPayload;
    return null;
  } catch {
    return null;
  }
}

const PUZZLE_LABELS: Record<CraftType, string> = {
  "word-fill": "Word Fill-In",
  "cryptogram": "Cryptogram",
  "crossword": "Crossword",
  "word-search": "Word Search",
};

const PlayCraftPuzzle = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [solved, setSolved] = useState(false);
  const [startTime] = useState(() => Date.now());

  const payload = useMemo(() => {
    const d = searchParams.get("d");
    if (!d) return null;
    return decodeShareData(d);
  }, [searchParams]);

  const handleComplete = useCallback(() => {
    setSolved(true);
  }, []);

  if (!payload) {
    return (
      <Layout>
        <div className="container py-20 text-center space-y-4">
          <h1 className="font-display text-2xl font-bold text-foreground">Invalid Puzzle Link</h1>
          <p className="text-sm text-muted-foreground">This puzzle link is invalid or has expired.</p>
          <Button variant="outline" onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </Layout>
    );
  }

  const { type, puzzleData, revealMessage } = payload;

  return (
    <Layout>
      <div className="container py-6 md:py-10 max-w-2xl mx-auto">
        <div className="mb-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} /> Home
          </button>
        </div>

        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-widest text-primary mb-1">Custom Puzzle</p>
          <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">
            {PUZZLE_LABELS[type]}
          </h1>
        </div>

        {solved && revealMessage && (
          <div className="mb-6 p-4 rounded-lg bg-primary/5 border border-primary/20 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 mb-1">
              <PartyPopper className="h-4 w-4 text-primary" />
              <p className="text-xs font-medium text-primary">Puzzle Solved!</p>
            </div>
            <p className="text-sm italic text-foreground">{revealMessage}</p>
          </div>
        )}

        {solved && !revealMessage && (
          <div className="mb-6 p-4 rounded-lg bg-primary/5 border border-primary/20 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2">
              <PartyPopper className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-primary">Puzzle Solved!</p>
            </div>
          </div>
        )}

        <div className="min-h-[300px]">
          {(type === "word-fill" || type === "crossword") && (
            <GridSolver
              data={puzzleData}
              puzzleType={type}
              onComplete={handleComplete}
            />
          )}
          {type === "cryptogram" && (
            <CryptogramSolver
              data={puzzleData}
              onComplete={handleComplete}
            />
          )}
          {type === "word-search" && (
            <WordSearchSolver
              data={puzzleData}
              onComplete={handleComplete}
            />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default PlayCraftPuzzle;
