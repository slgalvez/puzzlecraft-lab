import React, { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Trophy, Clock, Share, CheckCheck, RefreshCw, Palette } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  GridSolver,
  CryptogramSolver,
  WordSearchSolver,
} from "@/components/private/PrivatePuzzleSolvers";
import { buildSolveResultShareText } from "@/lib/craftShare";
import { getTheme } from "@/lib/craftThemes";
import { hapticSuccess, hapticTap } from "@/lib/haptic";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// ── Types ──────────────────────────────────────────────────────────────────

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

interface PuzzleRow {
  payload: CraftPayload;
  started_at: string | null;
  completed_at: string | null;
  solve_time: number | null;
  creator_solve_time: number | null;
}

const PUZZLE_LABELS: Record<CraftType, string> = {
  "word-fill": "Word Fill-In",
  cryptogram: "Cryptogram",
  crossword: "Crossword",
  "word-search": "Word Search",
};

const TAB_LABELS: Record<string, string> = {
  drafts: "Drafts",
  sent: "Sent",
  received: "Received",
};

// ── Time formatting ────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
}

// ── Confetti particle ──────────────────────────────────────────────────────

const CONFETTI_COLORS = ["bg-primary", "bg-amber-400", "bg-emerald-400", "bg-sky-400", "bg-pink-400"];

// ── Main component ─────────────────────────────────────────────────────────

const SharedCraftPuzzle = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const fromInbox = (location.state as { fromInbox?: string } | null)?.fromInbox;

  // ── State ──
  const [solved, setSolved] = useState(false);
  const [payload, setPayload] = useState<CraftPayload | null>(null);
  const [creatorSolveTime, setCreatorSolveTime] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [completionVisible, setCompletionVisible] = useState(false);

  // ── Timer ──
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const interactionMarked = React.useRef(false);
  const solveTimeRef = useRef<number>(0);

  // ── Load puzzle ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) { setError(true); setLoading(false); return; }

    (async () => {
      const { data, error: err } = await supabase
        .from("shared_puzzles" as any)
        .select("payload, started_at, completed_at, solve_time, creator_solve_time")
        .eq("id", id)
        .single();

      if (!err && data) {
        const row = data as unknown as PuzzleRow;
        const p = row.payload;
        if (p?.type && p?.puzzleData) {
          setPayload(p);
          setCreatorSolveTime(row.creator_solve_time ?? null);

          // If already completed, show result immediately
          if (row.completed_at && row.solve_time) {
            setSolved(true);
            setElapsed(row.solve_time);
            solveTimeRef.current = row.solve_time;
          }

          setLoading(false);
          return;
        }
      }

      setError(true);
      setLoading(false);
    })();
  }, [id]);

  // ── Timer: start on first interaction ─────────────────────────────────

  const startTimer = useCallback(() => {
    if (startTimeRef.current !== null) return; // already started
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - startTimeRef.current!) / 1000);
      setElapsed(secs);
      solveTimeRef.current = secs;
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // Final elapsed snap
    if (startTimeRef.current !== null) {
      const final = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsed(final);
      solveTimeRef.current = final;
    }
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // ── Mark started in DB on first interaction ────────────────────────────

  const markStarted = useCallback(() => {
    if (!id || interactionMarked.current) return;
    interactionMarked.current = true;
    startTimer();
    supabase
      .from("shared_puzzles" as any)
      .update({ started_at: new Date().toISOString() } as any)
      .eq("id", id)
      .is("started_at" as any, null)
      .then();
  }, [id, startTimer]);

  // ── Handle completion ──────────────────────────────────────────────────

  const handleComplete = useCallback(() => {
    stopTimer();
    const finalTime = solveTimeRef.current;
    setSolved(true);
    hapticSuccess();

    // Write solve_time + completed_at to DB
    if (id) {
      supabase
        .from("shared_puzzles" as any)
        .update({
          completed_at: new Date().toISOString(),
          solve_time: finalTime,
        } as any)
        .eq("id", id)
        .is("completed_at" as any, null)
        .then();
    }

    // Stagger confetti + completion panel
    setTimeout(() => setShowConfetti(true), 100);
    setTimeout(() => setCompletionVisible(true), 200);
  }, [id, stopTimer]);

  // ── Share result ───────────────────────────────────────────────────────

  const handleShareResult = useCallback(async () => {
    if (!payload) return;
    hapticTap();

    const text = buildSolveResultShareText(
      payload.title,
      payload.type,
      solveTimeRef.current,
      creatorSolveTime,
      id ? `${window.location.origin}/s/${id}` : undefined
    );

    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch { /* fall through to clipboard */ }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: "Result copied!" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  }, [payload, creatorSolveTime, id, toast]);

  // ── Derived values ─────────────────────────────────────────────────────

  const beatCreator = creatorSolveTime !== null && solveTimeRef.current > 0
    && solveTimeRef.current < creatorSolveTime;
  const tiedCreator = creatorSolveTime !== null && solveTimeRef.current > 0
    && solveTimeRef.current === creatorSolveTime;
  const improvement = creatorSolveTime !== null && solveTimeRef.current > 0
    ? creatorSolveTime - solveTimeRef.current
    : null;

  // ── Loading / error states ─────────────────────────────────────────────

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
  const theme = getTheme(payload.theme);

  return (
    <>
      {/* CSS animations */}
      <style>{`
        @keyframes craft-confetti {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(200px) rotate(540deg); opacity: 0; }
        }
        @keyframes craft-pop {
          0%   { transform: scale(0.4); opacity: 0; }
          65%  { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes craft-slide {
          from { transform: translateY(16px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        @keyframes craft-beat {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.08); }
        }
        .craft-pop    { animation: craft-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .craft-slide  { animation: craft-slide 0.4s ease-out forwards; }
        .craft-beat   { animation: craft-beat 1.4s ease-in-out infinite; }
        .craft-confetti-p {
          animation: craft-confetti var(--dur) ease-out var(--delay) forwards;
          opacity: 0;
        }
      `}</style>

      <Layout>
        <div className="container py-6 md:py-10 max-w-2xl mx-auto">

          {/* Back button */}
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
              <ArrowLeft size={14} />
              {fromInbox ? TAB_LABELS[fromInbox] || "Inbox" : "Home"}
            </button>
          </div>

          <div className="max-w-md mx-auto space-y-4">

            {/* Header */}
            <div className="text-center">
              {/* Theme emoji badge */}
              {theme.id !== "none" && (
                <div
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-3 text-xs font-medium"
                  style={{
                    background: `hsl(${theme.accentHsl} / 0.12)`,
                    color: `hsl(${theme.accentHsl})`,
                  }}
                >
                  <span>{theme.emoji}</span>
                  <span>{theme.label.split(" ")[0]}</span>
                </div>
              )}
              <p
                className="text-[10px] font-bold uppercase tracking-widest mb-1.5"
                style={{ color: theme.id !== "none" ? `hsl(${theme.accentHsl})` : undefined }}
              >
                {PUZZLE_LABELS[type]}
              </p>
              {title && (
                <h1 className="text-lg font-display font-semibold text-foreground sm:text-xl">{title}</h1>
              )}
              {from && !title && (
                <p className="text-sm text-muted-foreground italic">from {from}</p>
              )}
            </div>

            {/* Challenge banner — shown when creator set a time to beat */}
            {creatorSolveTime !== null && !solved && (
              <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <Trophy size={15} className="text-primary shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Beat {from ? `${from}'s` : "the creator's"} time: {formatTime(creatorSolveTime)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Your timer starts when you make your first move
                  </p>
                </div>
              </div>
            )}

            {/* Live timer — shown once started, hidden after solve */}
            {startTimeRef.current !== null && !solved && (
              <div className="flex items-center justify-center gap-2 py-1">
                <Clock size={12} className="text-muted-foreground" />
                <span className="font-mono text-sm font-medium text-muted-foreground tabular-nums">
                  {formatTime(elapsed)}
                </span>
              </div>
            )}

            {/* Puzzle solver */}
            {!solved && (
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
            )}

            {/* From tag — shown during solve */}
            {from && title && !solved && (
              <p className="text-[11px] text-muted-foreground/50 text-right italic">{from}</p>
            )}

            {/* ── COMPLETION SCREEN ── */}
            {solved && (
              <div className={cn(
                "space-y-4 transition-all duration-500",
                completionVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              )}>
                {/* Confetti */}
                {showConfetti && (
                  <div className="relative h-0 overflow-visible pointer-events-none" aria-hidden>
                    {Array.from({ length: 20 }, (_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "absolute top-0 rounded-sm craft-confetti-p",
                          i % 2 === 0 ? "w-2 h-2" : "w-1.5 h-1.5",
                          CONFETTI_COLORS[i % CONFETTI_COLORS.length]
                        )}
                        style={{
                          left: `${5 + (i * 19) % 88}%`,
                          ["--dur" as string]: `${0.75 + (i * 0.06) % 0.55}s`,
                          ["--delay" as string]: `${(i * 0.04) % 0.35}s`,
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Result card */}
                <div className="rounded-2xl border bg-card overflow-hidden">
                  {/* Accent bar */}
                  <div className={cn(
                    "h-1.5",
                    beatCreator ? "bg-amber-400" : "bg-primary"
                  )} />

                  <div className="px-5 pt-6 pb-5 text-center space-y-4">
                    {/* Icon */}
                    <div className={cn(
                      "mx-auto h-16 w-16 rounded-2xl flex items-center justify-center craft-pop",
                      beatCreator ? "bg-amber-400/15" : "bg-primary/10"
                    )}>
                      {beatCreator
                        ? <Trophy size={30} className="text-amber-500" />
                        : <span className="text-3xl">🧩</span>
                      }
                    </div>

                    {/* Headline */}
                    <div className="craft-slide">
                      {beatCreator ? (
                        <>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-1">
                            You beat the creator!
                          </p>
                          <h2 className="font-display text-xl font-bold text-foreground">
                            {title || PUZZLE_LABELS[type]} — Solved
                          </h2>
                        </>
                      ) : tiedCreator ? (
                        <>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">
                            Perfectly Tied!
                          </p>
                          <h2 className="font-display text-xl font-bold text-foreground">
                            {title || PUZZLE_LABELS[type]} — Solved
                          </h2>
                        </>
                      ) : (
                        <>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">
                            Puzzle Solved!
                          </p>
                          <h2 className="font-display text-xl font-bold text-foreground">
                            {title || PUZZLE_LABELS[type]}
                          </h2>
                        </>
                      )}
                    </div>

                    {/* Time display */}
                    {solveTimeRef.current > 0 && (
                      <div className="craft-slide flex items-end justify-center gap-4">
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-0.5">Your time</p>
                          <p className={cn(
                            "font-mono text-4xl font-bold leading-none tabular-nums",
                            beatCreator ? "text-amber-500" : "text-foreground"
                          )}>
                            {formatTime(solveTimeRef.current)}
                          </p>
                        </div>

                        {/* Creator time comparison */}
                        {creatorSolveTime !== null && (
                          <div className="text-left pb-1">
                            <p className="text-[10px] text-muted-foreground mb-0.5">
                              {from ? `${from}'s time` : "Creator's time"}
                            </p>
                            <p className="font-mono text-xl font-semibold text-muted-foreground">
                              {formatTime(creatorSolveTime)}
                            </p>
                            {improvement !== null && improvement > 0 && (
                              <p className="text-[10px] text-emerald-500 font-semibold mt-0.5">
                                -{formatTime(improvement)} faster
                              </p>
                            )}
                            {improvement !== null && improvement < 0 && (
                              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                +{formatTime(Math.abs(improvement))} behind
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Reveal message */}
                    {revealMessage && (
                      <div className="rounded-xl bg-primary/5 border border-primary/15 px-4 py-3 text-left">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1.5">
                          Message from {from || "the creator"}
                        </p>
                        <p className="text-sm italic text-foreground leading-relaxed">
                          {revealMessage}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="space-y-2.5">
                  {/* Share result */}
                  <Button
                    onClick={handleShareResult}
                    className="w-full gap-2 rounded-xl h-12 font-semibold active:scale-[0.97] transition-transform"
                  >
                    {copied ? <CheckCheck size={16} /> : <Share size={16} />}
                    {copied ? "Copied!" : "Share Your Result"}
                  </Button>

                  {/* Send one back */}
                  <Button
                    variant="outline"
                    onClick={() => {
                      hapticTap();
                      navigate("/craft", { state: { prefillTitle: from ? `For ${from}` : "", startAtContent: true } });
                    }}
                    className="w-full gap-2 rounded-xl h-11"
                  >
                    <Palette size={15} />
                    Send One Back to {from || "them"}
                  </Button>

                  {/* Play another */}
                  <button
                    type="button"
                    onClick={() => { hapticTap(); navigate("/"); }}
                    className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2.5"
                  >
                    Play another puzzle
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      </Layout>
    </>
  );
};

export default SharedCraftPuzzle;
