import { useEffect, useRef, useCallback, useState } from "react";
import { saveProgress } from "@/lib/puzzleProgress";

type SaveStatus = "idle" | "saving" | "saved";

interface UseAutoSaveOptions<T> {
  /** localStorage key for this puzzle */
  puzzleKey: string;
  /** Current puzzle state to persist */
  getState: () => T;
  /** Current elapsed seconds */
  getElapsed: () => number;
  /** If true, skip saving (puzzle is solved/revealed) */
  disabled?: boolean;
  /** Debounce interval in ms (default 3000) */
  debounceMs?: number;
}

/**
 * Background auto-save hook.
 * Saves on: state changes (debounced), visibility change, beforeunload, periodic interval.
 * Returns a status string for subtle UI feedback.
 */
export function useAutoSave<T>({
  puzzleKey,
  getState,
  getElapsed,
  disabled = false,
  debounceMs = 3000,
}: UseAutoSaveOptions<T>) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("");
  const getStateRef = useRef(getState);
  const getElapsedRef = useRef(getElapsed);
  const disabledRef = useRef(disabled);
  const keyRef = useRef(puzzleKey);

  // Keep refs current
  getStateRef.current = getState;
  getElapsedRef.current = getElapsed;
  disabledRef.current = disabled;
  keyRef.current = puzzleKey;

  const doSave = useCallback((showStatus = true) => {
    if (disabledRef.current) return;
    const state = getStateRef.current();
    const elapsed = getElapsedRef.current();
    const snapshot = JSON.stringify(state) + "|" + elapsed;
    // Skip if nothing changed
    if (snapshot === lastSavedRef.current) return;
    lastSavedRef.current = snapshot;

    if (showStatus) setStatus("saving");
    saveProgress(keyRef.current, state, elapsed);
    if (showStatus) {
      // Brief "saved" then fade
      setTimeout(() => setStatus("saved"), 150);
      setTimeout(() => setStatus("idle"), 2000);
    }
  }, []);

  const debouncedSave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSave(true), debounceMs);
  }, [doSave, debounceMs]);

  // Trigger debounced save when puzzle key changes (means state likely changed externally)
  useEffect(() => {
    lastSavedRef.current = ""; // Reset on key change
  }, [puzzleKey]);

  // Visibility change — force save immediately
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        doSave(false);
      }
    };
    const handleBeforeUnload = () => {
      doSave(false);
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
    };
  }, [doSave]);

  // Periodic save every 30s as a safety net
  useEffect(() => {
    if (disabled) return;
    const id = setInterval(() => doSave(false), 30_000);
    return () => clearInterval(id);
  }, [disabled, doSave]);

  // Cleanup debounce + final save on unmount (navigation away)
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      doSave(false);
    };
  }, [doSave]);

  return { status, debouncedSave, forceSave: doSave };
}
