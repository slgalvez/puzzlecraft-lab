import { useRef, useEffect, useCallback } from "react";

interface Props {
  active: boolean;
  onLetter: (letter: string) => void;
  onDelete: () => void;
  inputMode?: "text" | "numeric";
  /** Increment to re-trigger focus (e.g. on each cell tap) */
  focusTrigger?: number;
}

/**
 * Hidden input that triggers the mobile keyboard when a cell is active.
 * Uses opacity:0 + fixed positioning so mobile browsers reliably open the keyboard
 * (sr-only / clip prevents keyboard on many devices).
 */
const MobileLetterInput = ({ active, onLetter, onDelete, inputMode = "text", focusTrigger = 0 }: Props) => {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (active && ref.current) {
      // Small delay to avoid scroll jumps on mobile
      const timer = setTimeout(() => {
        ref.current?.focus({ preventScroll: true });
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [active, focusTrigger]);

  const handleInput = useCallback((e: React.FormEvent<HTMLInputElement>) => {
    const value = (e.target as HTMLInputElement).value;
    if (!value) return;
    const char = value.slice(-1).toUpperCase();
    if (inputMode === "numeric" && /^[0-9]$/.test(char)) {
      onLetter(char);
    } else if (inputMode === "text" && /^[A-Z]$/.test(char)) {
      onLetter(char);
    }
    // Clear the input to allow re-entry
    if (ref.current) ref.current.value = "";
  }, [onLetter, inputMode]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      onDelete();
    }
  }, [onDelete]);

  if (!active) return null;

  return (
    <input
      ref={ref}
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        opacity: 0,
        width: "1px",
        height: "1px",
        border: "none",
        padding: 0,
        margin: 0,
        pointerEvents: "none",
        zIndex: -1,
      }}
      inputMode={inputMode === "numeric" ? "numeric" : "text"}
      autoCapitalize="characters"
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      aria-hidden="true"
    />
  );
};

export default MobileLetterInput;
