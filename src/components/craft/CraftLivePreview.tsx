/**
 * CraftLivePreview.tsx
 * src/components/craft/CraftLivePreview.tsx
 *
 * Elevated preview panel with row-staggered cell entrance and contextual header.
 */

import { useEffect, useState, useRef, useMemo } from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  generateCustomFillIn,
  generateCustomWordSearch,
  generateCustomCryptogram,
  generateCustomCrossword,
} from "@/lib/generators/customPuzzles";
import type { CraftSettings } from "@/components/craft/CraftSettingsPanel";

type CraftType = "word-fill" | "cryptogram" | "crossword" | "word-search";

interface Props {
  type: CraftType;
  wordInput: string;
  phraseInput: string;
  clueEntries: { answer: string; clue: string }[];
  difficulty: CraftSettings["difficulty"];
}

// ── Validation ─────────────────────────────────────────────────────────────────

interface ValidationResult {
  valid: boolean;
  count: number;
  feedback: string;
  hint: string;
  color: "green" | "amber" | "red" | "muted";
}

function validateWords(raw: string, type: "word-fill" | "word-search"): ValidationResult {
  const words = raw
    .split(/[,\n]+/)
    .map((w) => w.trim().toUpperCase().replace(/[^A-Z]/g, ""))
    .filter((w) => w.length >= 2);
  const count = words.length;

  if (count === 0)  return { valid: false, count: 0, feedback: "Enter some words to get started", hint: "", color: "muted" };
  if (count === 1)  return { valid: false, count: 1, feedback: "Add at least 2 words", hint: "Try adding more words connected to your theme", color: "red" };
  if (count < 4)    return { valid: true,  count,    feedback: `${count} words — keep going, the grid gets richer`, hint: "5–15 words gives the best results", color: "amber" };
  if (count <= 8)   return { valid: true,  count,    feedback: `${count} words — your puzzle is ready to build`, hint: "", color: "green" };
  if (count <= 15)  return { valid: true,  count,    feedback: `${count} words — this will be a great puzzle`, hint: "", color: "green" };
  return { valid: true, count, feedback: `${count} words — plenty to work with`, hint: "Extra words may not all fit — that's fine", color: "amber" };
}

function validatePhrase(raw: string): ValidationResult {
  const cleaned = raw.trim();
  const letters  = cleaned.replace(/[^A-Za-z]/g, "");

  if (letters.length === 0)   return { valid: false, count: 0,             feedback: "Enter a phrase to encode", hint: "", color: "muted" };
  if (letters.length < 6)     return { valid: false, count: letters.length, feedback: "Phrase is too short", hint: "Try at least 6 letters for a good cryptogram", color: "red" };
  if (letters.length < 15)    return { valid: true,  count: letters.length, feedback: `${letters.length} letters — short but it'll work`, hint: "Longer phrases make more satisfying puzzles", color: "amber" };
  if (letters.length <= 60)   return { valid: true,  count: letters.length, feedback: `${letters.length} letters — perfect`, hint: "", color: "green" };
  return { valid: true, count: letters.length, feedback: `${letters.length} letters — a bit long`, hint: "Very long phrases can be hard to display on mobile", color: "amber" };
}

function validateClues(entries: { answer: string; clue: string }[]): ValidationResult {
  const valid = entries.filter((e) => e.answer.trim().replace(/[^A-Za-z]/g, "").length >= 2 && e.clue.trim().length > 0);
  const count = valid.length;

  if (count === 0) return { valid: false, count: 0, feedback: "Add some answer + clue pairs", hint: "", color: "muted" };
  if (count === 1) return { valid: false, count: 1, feedback: "Add at least 2 pairs", hint: "Crosswords need multiple intersecting words", color: "red" };
  if (count < 4)   return { valid: true,  count,    feedback: `${count} pairs — add a few more`, hint: "4–8 pairs makes a satisfying crossword", color: "amber" };
  if (count <= 8)  return { valid: true,  count,    feedback: `${count} pairs — this will be great`, hint: "", color: "green" };
  return { valid: true, count, feedback: `${count} pairs — full puzzle`, hint: "Some words may not all fit — that's normal", color: "amber" };
}

// ── Mini grid renderers ────────────────────────────────────────────────────────

function MiniGrid({
  data,
  type,
  animKey,
}: {
  data: Record<string, unknown>;
  type: "word-fill" | "crossword";
  animKey: number;
}) {
  const gridSize   = (data.gridSize as number) || 9;
  const blackCells = (data.blackCells as [number, number][]) || [];
  const blacks     = new Set(blackCells.map(([r, c]) => `${r}-${c}`));
  const cellSize   = Math.min(22, Math.floor(252 / gridSize));
  const fontSize   = Math.max(6, cellSize * 0.52);

  const solutionGrid: (string | null)[][] = [];
  if (type === "word-fill" && data.solution) {
    const sol = data.solution as (string | null)[][];
    for (let r = 0; r < gridSize; r++) solutionGrid[r] = sol[r] || [];
  } else if (type === "crossword" && data.clues) {
    for (let r = 0; r < gridSize; r++) solutionGrid[r] = Array(gridSize).fill(null);
    const clues = data.clues as { answer: string; row: number; col: number; direction: "across" | "down" }[];
    for (const clue of clues) {
      for (let i = 0; i < clue.answer.length; i++) {
        const r = clue.direction === "down"   ? clue.row + i : clue.row;
        const c = clue.direction === "across" ? clue.col + i : clue.col;
        if (r < gridSize && c < gridSize) solutionGrid[r][c] = clue.answer[i];
      }
    }
  }

  return (
    <div
      key={animKey}
      className="inline-grid gap-0 border border-border/40 rounded overflow-hidden"
      style={{ gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)` }}
    >
      {Array.from({ length: gridSize }, (_, r) =>
        Array.from({ length: gridSize }, (_, c) => {
          const isBlack = blacks.has(`${r}-${c}`);
          const letter  = solutionGrid[r]?.[c] || null;
          return (
            <div
              key={`${r}-${c}`}
              className={cn(
                "border border-border/20 flex items-center justify-center",
                isBlack ? "bg-foreground/80" : "bg-card",
              )}
              style={{
                width: cellSize,
                height: cellSize,
                fontSize,
                animation: `craftCellIn 0.18s ease-out ${r * 28}ms both`,
              }}
            >
              {!isBlack && letter && (
                <span className="font-mono font-semibold text-foreground leading-none">
                  {letter}
                </span>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

function MiniWordSearch({
  data,
  animKey,
}: {
  data: Record<string, unknown>;
  animKey: number;
}) {
  const grid          = (data.grid as string[][]) || [];
  const wordPositions = (data.wordPositions as { word: string; row: number; col: number; dr: number; dc: number }[]) || [];
  const size          = Math.min(grid.length, 14);
  const cellSize      = Math.min(18, Math.floor(252 / size));
  const fontSize      = Math.max(6, cellSize * 0.55);

  const solutionCells = useMemo(() => {
    const cells = new Set<string>();
    for (const wp of wordPositions) {
      for (let i = 0; i < wp.word.length; i++) {
        cells.add(`${wp.row + wp.dr * i}-${wp.col + wp.dc * i}`);
      }
    }
    return cells;
  }, [wordPositions]);

  return (
    <div
      key={animKey}
      className="inline-grid gap-0 border border-border/30 rounded overflow-hidden"
      style={{ gridTemplateColumns: `repeat(${size}, ${cellSize}px)` }}
    >
      {Array.from({ length: size }, (_, r) =>
        Array.from({ length: size }, (_, c) => {
          const isSolution = solutionCells.has(`${r}-${c}`);
          return (
            <div
              key={`${r}-${c}`}
              className={cn(
                "flex items-center justify-center font-mono",
                isSolution
                  ? "bg-primary/20 text-primary font-bold"
                  : "text-foreground/30",
              )}
              style={{
                width: cellSize,
                height: cellSize,
                fontSize,
                animation: `craftCellIn 0.15s ease-out ${r * 20}ms both`,
              }}
            >
              {grid[r]?.[c] || "·"}
            </div>
          );
        })
      )}
    </div>
  );
}

function MiniCryptogram({
  data,
  animKey,
}: {
  data: Record<string, unknown>;
  animKey: number;
}) {
  const encoded      = (data.encoded as string) || "";
  const decoded      = (data.decoded as string) || "";
  const previewEnc   = encoded.slice(0, 48) + (encoded.length > 48 ? "…" : "");
  const previewDec   = decoded.slice(0, 48) + (decoded.length > 48 ? "…" : "");

  return (
    <div
      key={animKey}
      className="space-y-1.5"
      style={{ animation: "craftCellIn 0.25s ease-out both" }}
    >
      <div className="font-mono text-xs leading-relaxed break-all flex flex-wrap gap-x-1.5 gap-y-1">
        {previewEnc.split("").map((ch, i) => (
          ch === " " ? (
            <span key={i} className="w-2" />
          ) : (
            <span key={i} className="inline-flex flex-col items-center">
              <span className="border-b border-foreground/20 w-4 text-center text-foreground/60 text-[10px]">{ch}</span>
              <span className="w-4 text-center text-primary text-[9px] font-bold">
                {previewDec[i] !== " " ? previewDec[i] : ""}
              </span>
            </span>
          )
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground/50 italic">Your encoded message — solution shown in color</p>
    </div>
  );
}

// ── Feedback row ───────────────────────────────────────────────────────────────

function FeedbackRow({ validation }: { validation: ValidationResult }) {
  if (validation.color === "muted") return null;

  const icon = validation.color === "green"
    ? <CheckCircle2 size={12} className="text-emerald-500 shrink-0 mt-px" />
    : validation.color === "red"
      ? <AlertCircle size={12} className="text-destructive shrink-0 mt-px" />
      : <Info size={12} className="text-amber-500 shrink-0 mt-px" />;

  const textColor = {
    green: "text-emerald-600 dark:text-emerald-400",
    red:   "text-destructive",
    amber: "text-amber-600 dark:text-amber-400",
    muted: "text-muted-foreground",
  }[validation.color];

  return (
    <div className="flex items-start gap-1.5">
      {icon}
      <div>
        <span className={cn("text-[11px] font-medium", textColor)}>
          {validation.feedback}
        </span>
        {validation.hint && (
          <span className="text-[11px] text-muted-foreground/55 ml-1.5">
            {validation.hint}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Loading dots ───────────────────────────────────────────────────────────────

function BuildingIndicator() {
  return (
    <div className="h-20 flex flex-col items-center justify-center gap-2">
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-primary/50"
            style={{ animation: `craftDotPulse 1s ease-in-out ${i * 150}ms infinite` }}
          />
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground/50">Building your puzzle…</p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 800;

export default function CraftLivePreview({
  type,
  wordInput,
  phraseInput,
  clueEntries,
  difficulty,
}: Props) {
  const [preview,    setPreview]    = useState<Record<string, unknown> | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError,   setGenError]   = useState(false);
  const [animKey,    setAnimKey]    = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef  = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const validation = useMemo<ValidationResult>(() => {
    switch (type) {
      case "word-fill":
      case "word-search":  return validateWords(wordInput, type);
      case "cryptogram":   return validatePhrase(phraseInput);
      case "crossword":    return validateClues(clueEntries);
    }
  }, [type, wordInput, phraseInput, clueEntries]);

  useEffect(() => {
    if (!validation.valid) {
      setPreview(null);
      setGenError(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setGenerating(true);
    setGenError(false);

    debounceRef.current = setTimeout(() => {
      try {
        let data: Record<string, unknown> | null = null;

        switch (type) {
          case "word-fill": {
            const words = wordInput.split(/[,\n]+/).map((w) => w.trim().toUpperCase().replace(/[^A-Z]/g, "")).filter((w) => w.length >= 2);
            data = generateCustomFillIn(words, difficulty) as unknown as Record<string, unknown>;
            break;
          }
          case "word-search": {
            const words = wordInput.split(/[,\n]+/).map((w) => w.trim().toUpperCase().replace(/[^A-Z]/g, "")).filter((w) => w.length >= 2);
            data = generateCustomWordSearch(words, difficulty) as unknown as Record<string, unknown>;
            break;
          }
          case "cryptogram": {
            if (phraseInput.trim().length >= 6) {
              data = generateCustomCryptogram(phraseInput.trim(), difficulty) as unknown as Record<string, unknown>;
            }
            break;
          }
          case "crossword": {
            const valid = clueEntries.filter((e) => e.answer.trim().replace(/[^A-Za-z]/g, "").length >= 2 && e.clue.trim().length > 0);
            if (valid.length >= 2) {
              data = generateCustomCrossword(valid, difficulty) as unknown as Record<string, unknown>;
            }
            break;
          }
        }

        if (mountedRef.current) {
          setPreview(data);
          setGenerating(false);
          setAnimKey((k) => k + 1);
        }
      } catch {
        if (mountedRef.current) {
          setGenError(true);
          setGenerating(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [type, wordInput, phraseInput, clueEntries, difficulty, validation.valid]);

  return (
    <>
      <style>{`
        @keyframes craftCellIn {
          from { opacity: 0; transform: scale(0.82); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes craftDotPulse {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50%       { opacity: 1;   transform: translateY(-3px); }
        }
      `}</style>

      <div className="space-y-2.5">
        <FeedbackRow validation={validation} />

        {(generating || preview || genError) && (
          <div className="rounded-xl border border-primary/15 bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 bg-secondary/20">
              <p className="text-[11px] font-semibold text-foreground/70">
                {generating && !preview
                  ? "Building…"
                  : genError
                    ? "Preview unavailable"
                    : "Your puzzle so far"}
              </p>
              {generating && preview && (
                <div className="flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1 h-1 rounded-full bg-primary/40"
                      style={{ animation: `craftDotPulse 0.8s ease-in-out ${i * 120}ms infinite` }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="px-4 py-4">
              {generating && !preview && <BuildingIndicator />}

              {genError && (
                <p className="text-[11px] text-muted-foreground/60 text-center py-3">
                  Couldn't generate a preview — try adjusting your words.
                </p>
              )}

              {preview && !genError && (
                <div className={cn(
                  "transition-opacity duration-200",
                  generating ? "opacity-50" : "opacity-100",
                )}>
                  {(type === "word-fill" || type === "crossword") && (
                    <div className="flex justify-center">
                      <MiniGrid data={preview} type={type} animKey={animKey} />
                    </div>
                  )}
                  {type === "word-search" && (
                    <div className="flex justify-center">
                      <MiniWordSearch data={preview} animKey={animKey} />
                    </div>
                  )}
                  {type === "cryptogram" && (
                    <MiniCryptogram data={preview} animKey={animKey} />
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
