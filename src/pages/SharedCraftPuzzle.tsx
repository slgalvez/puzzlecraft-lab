import React, { useState, useCallback, useEffect } from "react";
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
  const interactionMarked = React.useRef(false);

  useEffect(() => {
    if (!id) { setError(true); setLoading(false); return; }

    const load = async () => {
      // First try loading directly from shared_puzzles
      const { data, error: err } = await supabase
        .from("shared_puzzles" as any)
        .select("payload")
        .eq("id", id)
        .single();

      if (!err && data) {
        const row = data as any;
        const p = row.payload as CraftPayload;
        if (p?.type && p?.puzzleData) {
          setPayload(p);
          setLoading(false);
          return;
        }
      }

      // Fallback: check if this is a recipient-specific link
      const { data: recData } = await supabase
        .from("craft_recipients" as any)
        .select("puzzle_id")
        .eq("id", id)
        .single();

      if (recData) {
        recipientId.current = id;
        const parentId = (recData as any).puzzle_id;
        const { data: parentData } = await supabase
          .from("shared_puzzles" as any)
          .select("payload")
          .eq("id", parentId)
          .single();

        if (parentData) {
          const p = (parentData as any).payload as CraftPayload;
          if (p?.type && p?.puzzleData) {
            setPayload(p);
            setLoading(false);
            return;
          }
        }
      }

      setError(true);
      setLoading(false);
    };
    load();
  }, [id]);

  // Mark puzzle as "in progress" on first real interaction
  const markStarted = useCallback(() => {
    if (!id || interactionMarked.current) return;
    interactionMarked.current = true;
    const now = new Date().toISOString();
    if (recipientId.current) {
      supabase
        .from("craft_recipients" as any)
        .update({ started_at: now } as any)
        .eq("id", recipientId.current)
        .is("started_at" as any, null)
        .then();
    } else {
      supabase
        .from("shared_puzzles" as any)
        .update({ started_at: now } as any)
        .eq("id", id)
        .is("started_at" as any, null)
        .then();
    }
  }, [id]);

  const handleComplete = useCallback(() => {
    setSolved(true);
    if (!id) return;
    const now = new Date().toISOString();
    if (recipientId.current) {
      supabase
        .from("craft_recipients" as any)
        .update({ completed_at: now } as any)
        .eq("id", recipientId.current)
        .is("completed_at" as any, null)
        .then();
    } else {
      supabase
        .from("shared_puzzles" as any)
        .update({ completed_at: now } as any)
        .eq("id", id)
        .is("completed_at" as any, null)
        .then();
    }
  }, [id]);

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

        {/* Unified puzzle container — all elements anchor to this */}
        <div className="max-w-md mx-auto space-y-4">
          {/* Header: type label + title */}
          <div className="text-center">
            <p className="text-[10px] font-medium uppercase tracking-widest text-primary mb-1.5">
              {PUZZLE_LABELS[type]}
            </p>
            {title && (
              <h1 className="text-lg font-display font-semibold text-foreground sm:text-xl">{title}</h1>
            )}
          </div>

          {/* Puzzle solver — detect first real interaction */}
          <div className="min-h-[300px]" onPointerDown={markStarted} onKeyDown={markStarted}>
            {(type === "word-fill" || type === "crossword") && (
              <GridSolver
                data={puzzleData}
                puzzleType={type}
                onComplete={handleComplete}
                showHints={settings?.hintsEnabled ?? true}
                showReveal={settings?.revealEnabled ?? false}
                showCheck={settings?.checkEnabled ?? true}
                compact
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
                compact
              />
            )}
          </div>

          {/* From — anchored bottom-right of puzzle container */}
          {from && (
            <p className="text-[11px] text-muted-foreground/60 text-right italic">
              {from}
            </p>
          )}

          {/* Post-solve: reveal message */}
          {solved && revealMessage && (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2 mb-1">
                <PartyPopper className="h-4 w-4 text-primary" />
                <p className="text-xs font-medium text-primary">Puzzle Solved!</p>
              </div>
              <p className="text-sm italic text-foreground">{revealMessage}</p>
            </div>
          )}

          {solved && !revealMessage && (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2">
                <PartyPopper className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-primary">Puzzle Solved!</p>
              </div>
            </div>
          )}

          {/* Post-solve: actions */}
          {solved && (
            <CraftCompletionActions senderName={from} puzzleType={type} />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default SharedCraftPuzzle;
