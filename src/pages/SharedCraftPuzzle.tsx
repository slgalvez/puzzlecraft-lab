import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PartyPopper, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

const PUZZLE_LABELS: Record<CraftType, string> = {
  "word-fill": "Word Fill-In",
  "cryptogram": "Cryptogram",
  "crossword": "Crossword",
  "word-search": "Word Search",
};

const TAB_LABELS: Record<string, string> = {
  drafts: "Drafts",
  sent: "Sent",
  received: "Received",
};

const SharedCraftPuzzle = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const fromInbox = (location.state as { fromInbox?: string } | null)?.fromInbox;
  const [solved, setSolved] = useState(false);
  const [payload, setPayload] = useState<CraftPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) { setError(true); setLoading(false); return; }

    const load = async () => {
      const { data, error: err } = await supabase
        .from("shared_puzzles" as any)
        .select("payload")
        .eq("id", id)
        .single();

      if (err || !data) {
        setError(true);
      } else {
        const row = data as any;
        const p = row.payload as CraftPayload;
        if (p?.type && p?.puzzleData) {
          setPayload(p);
        } else {
          setError(true);
        }
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const handleComplete = useCallback(() => {
    setSolved(true);
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="container py-20 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (error || !payload) {
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
            onClick={() => {
              if (fromInbox) {
                navigate("/craft", { state: { inboxTab: fromInbox } });
              } else {
                navigate("/");
              }
            }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} /> {fromInbox ? TAB_LABELS[fromInbox] || "Inbox" : "Home"}
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
      </div>
    </Layout>
  );
};

export default SharedCraftPuzzle;
