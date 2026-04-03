/**
 * CraftLivePreview
 *
 * Shows a lightweight live preview of the puzzle as the creator types.
 * Debounces generation so it doesn't fire on every keystroke.
 * Displays word count, validation feedback, and a mini grid preview.
 *
 * Replaces the need to hit "Preview Puzzle" to see anything.
 */

import { useEffect, useState, useRef, useMemo } from "react";
import { Loader2, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  generateCustomFillIn,
  generateCustomWordSearch,
  generateCustomCryptogram,
  generateCustomCrossword,
} from "@/lib/generators/customPuzzles";
import type { CraftSettings } from "@/components/craft/CraftSettingsPanel";

// ── Types ──────────────────────────────────────────────────────────────────

type CraftType = "word-fill" | "cryptogram" | "crossword" | "word-search";

interface Props {
  type: CraftType;
  wordInput: string;
  phraseInput: string;
  clueEntries: { answer: string; clue: string }[];
  difficulty: CraftSettings["difficulty"];
}

// ── Word / phrase validation ───────────────────────────────────────────────

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

  if (count === 0) {
    return { valid: false, count: 0, feedback: "Enter some words to get started", hint: "", color: "muted" };
  }
  if (count === 1) {
    return { valid: false, count: 1, feedback: "Add at least 2 words", hint: "Try adding more words related to your theme", color: "red" };
  }
  if (count < 4) {
    return { valid: true, count, feedback: `${count} words — add a few more for a better puzzle`, hint: "5–15 words gives the best results", color: "amber" };
  }
  if (count <= 8) {
    return { valid: true, count, feedback: `${count} words — good`, hint: "Perfect for a satisfying puzzle", color: "green" };
  }
  if (count <= 15) {
    return { valid: true, count, feedback: `${count} words — great`, hint: "This will make a full, varied puzzle", color: "green" };
  }
  return { valid: true, count, feedback: `${count} words — plenty`, hint: "Extra words may not all fit — that's OK", color: "amber" };
}

function validatePhrase(raw: string): ValidationResult {
  const cleaned = raw.trim();
  const letters = cleaned.replace(/[^A-Za-z]/g, "");

  if (letters.length === 0) {
    return { valid: false, count: 0, feedback: "Enter a phrase to encode", hint: "", color: "muted" };
  }
  if (letters.length < 6) {
    return { valid: false, count: letters.length, feedback: "Phrase is too short", hint: "Try at least 6 letters for a good cryptogram", color: "red" };
  }
  if (letters.length < 15) {
    return { valid: true, count: letters.length, feedback: `${letters.length} letters — short but works`, hint: "Longer phrases make more satisfying puzzles", color: "amber" };
  }
  if (letters.length <= 60) {
    return { valid: true, count: letters.length, feedback: `${letters.length} letters — perfect`, hint: "", color: "green" };
  }
  return { valid: true, count: letters.length, feedback: `${letters.length} letters — a bit long`, hint: "Very long phrases can be hard to display on mobile", color: "amber" };
}

function validateClues(entries: { answer: string; clue: string }[]): ValidationResult {
  const valid = entries.filter((e) => e.answer.trim().replace(/[^A-Za-z]/g, "").length >= 2 && e.clue.trim().length > 0);
  const count = valid.length;

  if (count === 0) {
    return { valid: false, count: 0, feedback: "Add some answer + clue pairs", hint: "", color: "muted" };
  }
  if (count === 1) {
    return { valid: false, count: 1, feedback: "Add at least 2 pairs", hint: "Crosswords need multiple intersecting words", color: "red" };
  }
  if (count < 4) {
    return { valid: true, count, feedback: `${count} pairs — add a few more`, hint: "4–8 pairs makes a satisfying crossword", color: "amber" };
  }
  if (count <= 8) {
    return { valid: true, count, feedback: `${count} pairs — great`, hint: "", color: "green" };
  }
  return { valid: true, count, feedback: `${count} pairs — full puzzle`, hint: "Some words may not fit — that's normal", color: "amber" };
}

// ── Mini grid renderer ─────────────────────────────────────────────────────

function MiniGrid({ data, type }: { data: Record<string, unknown>; type: "word-fill" | "crossword" }) {
  const gridSize = (data.gridSize as number) || 9;
  const blackCells = (data.blackCells as [number, number][]) || [];
  const blacks = new Set(blackCells.map(([r, c]) => `${r}-${c}`));
  const cellSize = Math.min(22, Math.floor(240 / gridSize));
  const fontSize = Math.max(6, cellSize * 0.5);

  // Build solution grid from data
  const solutionGrid: (string | null)[][] = [];
  if (type === "word-fill" && data.solution) {
    const sol = data.solution as (string | null)[][];
    for (let r = 0; r < gridSize; r++) solutionGrid[r] = sol[r] || [];
  } else if (type === "crossword" && data.clues) {
    for (let r = 0; r < gridSize; r++) solutionGrid[r] = Array(gridSize).fill(null);
    const clues = data.clues as { answer: string; row: number; col: number; direction: "across" | "down" }[];
    for (const clue of clues) {
      for (let i = 0; i < clue.answer.length; i++) {
        const r = clue.direction === "down" ? clue.row + i : clue.row;
        const c = clue.direction === "across" ? clue.col + i : clue.col;
        if (r < gridSize && c < gridSize) solutionGrid[r][c] = clue.answer[i];
      }
    }
  }

  return (
    <div
      className="inline-grid gap-0 border border-border/50 rounded overflow-hidden"
      style={{ gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)` }}
    >
      {Array.from({ length: gridSize }, (_, r) =>
        Array.from({ length: gridSize }, (_, c) => {
          const isBlack = blacks.has(`${r}-${c}`);
          const letter = solutionGrid[r]?.[c] || null;
          return (
            <div
              key={`${r}-${c}`}
              className={cn(
                "border border-border/20 flex items-center justify-center",
                isBlack ? "bg-foreground/80" : "bg-card"
              )}
              style={{ width: cellSize, height: cellSize, fontSize }}
            >
              {!isBlack && letter && (
                <span className="font-mono font-medium text-foreground/70 leading-none">{letter}</span>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

function MiniWordSearch({ data }: { data: Record<string, unknown> }) {
  const grid = (data.grid as string[][]) || [];
  const size = Math.min(grid.length, 12); // cap display size
  const cellSize = Math.min(16, Math.floor(200 / size));

  return (
    <div
      className="inline-grid gap-0"
      style={{ gridTemplateColumns: `repeat(${size}, ${cellSize}px)` }}
    >
      {Array.from({ length: size }, (_, r) =>
        Array.from({ length: size }, (_, c) => (
          <div
            key={`${r}-${c}`}
            className="flex items-center justify-center font-mono text-foreground/40"
            style={{ width: cellSize, height: cellSize, fontSize: cellSize * 0.55 }}
          >
            {grid[r]?.[c] || "·"}
          </div>
        ))
      )}
    </div>
  );
}

function MiniCryptogram({ data }: { data: Record<string, unknown> }) {
  const encoded = (data.encoded as string) || "";
  const preview = encoded.slice(0, 40) + (encoded.length > 40 ? "…" : "");

  return (
    <div className="font-mono text-xs text-muted-foreground/70 leading-relaxed break-all">
      {preview.split("").map((ch, i) => (
        <span
          key={i}
          className={ch === " " ? "mr-2" : "inline-flex flex-col items-center mr-0.5"}
        >
          {ch !== " " && (
            <>
              <span className="border-b border-foreground/20 w-4 text-center text-foreground/60 text-[10px]">{ch}</span>
              <span className="text-[8px] text-muted-foreground/30 mt-0.5">·</span>
            </>
          )}
          {ch === " " && " "}
        </span>
      ))}
    </div>
  );
}

// ── Feedback indicator ─────────────────────────────────────────────────────

function FeedbackRow({ validation }: { validation: ValidationResult }) {
  if (validation.color === "muted") return null;

  const icon = validation.color === "green"
    ? <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
    : validation.color === "red"
      ? <AlertCircle size={12} className="text-destructive shrink-0" />
      : <Info size={12} className="text-amber-500 shrink-0" />;

  const textColor = validation.color === "green"
    ? "text-emerald-600"
    : validation.color === "red"
      ? "text-destructive"
      : "text-amber-600";

  return (
    <div className="flex items-start gap-1.5">
      {icon}
      <div>
        <span className={cn("text-[11px] font-medium", textColor)}>
          {validation.feedback}
        </span>
        {validation.hint && (
          <span className="text-[11px] text-muted-foreground/60 ml-1">
            — {validation.hint}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

const DEBOUNCE_MS = 800;

export default function CraftLivePreview({ type, wordInput, phraseInput, clueEntries, difficulty }: Props) {
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Validation (always live, no debounce)
  const validation = useMemo<ValidationResult>(() => {
    switch (type) {
      case "word-fill":
      case "word-search":
        return validateWords(wordInput, type);
      case "cryptogram":
        return validatePhrase(phraseInput);
      case "crossword":
        return validateClues(clueEntries);
    }
  }, [type, wordInput, phraseInput, clueEntries]);

  // Debounced preview generation
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
        }
      } catch {
        if (mountedRef.current) {
          setGenError(true);
          setGenerating(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [type, wordInput, phraseInput, clueEntries, difficulty, validation.valid]);

  return (
    <div className="space-y-3">
      {/* Validation feedback */}
      <FeedbackRow validation={validation} />

      {/* Live preview panel */}
      {(generating || preview || genError) && (
        <div className="rounded-xl border border-border/60 bg-secondary/30 p-3">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Live Preview
            </p>
            {generating && <Loader2 size={10} className="text-muted-foreground animate-spin" />}
          </div>

          {generating && !preview && (
            <div className="h-16 flex items-center justify-center">
              <span className="text-[11px] text-muted-foreground/50">Generating…</span>
            </div>
          )}

          {genError && (
            <p className="text-[11px] text-muted-foreground/60">
              Couldn't generate a preview — try adjusting your words.
            </p>
          )}

          {preview && !genError && (
            <div className={cn("transition-opacity duration-300", generating ? "opacity-40" : "opacity-100")}>
              {(type === "word-fill" || type === "crossword") && (
                <div className="flex justify-center">
                  <MiniGrid data={preview} type={type} />
                </div>
              )}
              {type === "word-search" && (
                <div className="flex justify-center">
                  <MiniWordSearch data={preview} />
                </div>
              )}
              {type === "cryptogram" && (
                <MiniCryptogram data={preview} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
