import { useState, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PartyPopper } from "lucide-react";
import CraftCompletionActions from "@/components/craft/CraftCompletionActions";
import {
  GridSolver,
  CryptogramSolver,
  WordSearchSolver,
} from "@/components/private/PrivatePuzzleSolvers";

type CraftType = "word-fill" | "cryptogram" | "crossword" | "word-search";

interface CraftPuzzleSettings {
  difficulty?: "easy" | "medium" | "hard";
  hintsEnabled?: boolean;
  revealEnabled?: boolean;
  checkEnabled?: boolean;
}

interface CraftPayload {
  type: CraftType;
  puzzleData: Record<string, unknown>;
  revealMessage: string;
  title?: string;
  from?: string;
  settings?: CraftPuzzleSettings;
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

  const { type, puzzleData, revealMessage, title, from, settings } = payload;

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

        {/* Header: type label, then title — matching preview layout */}
        <div className="mb-5 text-center">
          <p className="text-[10px] font-medium uppercase tracking-widest text-primary mb-1.5">
            {PUZZLE_LABELS[type]}
          </p>
          {title && (
            <h1 className="text-lg font-display font-semibold text-foreground sm:text-xl">{title}</h1>
          )}
        </div>

        {solved && revealMessage && (
          <div className="mb-4 p-4 rounded-lg bg-primary/5 border border-primary/20 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 mb-1">
              <PartyPopper className="h-4 w-4 text-primary" />
              <p className="text-xs font-medium text-primary">Puzzle Solved!</p>
            </div>
            <p className="text-sm italic text-foreground">{revealMessage}</p>
          </div>
        )}

        {solved && !revealMessage && (
          <div className="mb-4 p-4 rounded-lg bg-primary/5 border border-primary/20 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2">
              <PartyPopper className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-primary">Puzzle Solved!</p>
            </div>
          </div>
        )}

        {solved && (
          <CraftCompletionActions senderName={from} puzzleType={type} />
        )}

        <div className="min-h-[300px]">
          {(type === "word-fill" || type === "crossword") && (
            <GridSolver
              data={puzzleData}
              puzzleType={type}
              onComplete={handleComplete}
              showHints={settings?.hintsEnabled ?? true}
              showReveal={settings?.revealEnabled ?? false}
              showCheck={settings?.checkEnabled ?? true}
            />
          )}
          {type === "cryptogram" && (
            <CryptogramSolver
              data={puzzleData as unknown as { encoded: string; decoded: string; reverseCipher: Record<string, string>; hints: Record<string, string> }}
              onComplete={handleComplete}
              showHints={settings?.hintsEnabled ?? true}
              showReveal={settings?.revealEnabled ?? false}
            />
          )}
          {type === "word-search" && (
            <WordSearchSolver
              data={puzzleData as unknown as { grid: string[][]; words: string[]; wordPositions: { word: string; row: number; col: number; dr: number; dc: number }[]; size: number }}
              onComplete={handleComplete}
              showHints={settings?.hintsEnabled ?? true}
              showReveal={settings?.revealEnabled ?? false}
            />
          )}
        </div>

        {from && (
          <p className="text-[11px] text-muted-foreground/60 text-right italic mt-4">
            {from}
          </p>
        )}
      </div>
    </Layout>
  );
};

export default PlayCraftPuzzle;
