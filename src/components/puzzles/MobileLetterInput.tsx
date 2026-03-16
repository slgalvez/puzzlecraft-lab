import { useRef, useEffect, useCallback } from "react";

interface Props {
  active: boolean;
  onLetter: (letter: string) => void;
  onDelete: () => void;
  inputMode?: "text" | "numeric";
}

/**
 * Hidden input that triggers the mobile keyboard when a cell is active.
 * On desktop this is invisible and non-interfering.
 */
const MobileLetterInput = ({ active, onLetter, onDelete, inputMode = "text" }: Props) => {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (active && ref.current) {
      // Small delay to avoid scroll jumps on mobile
      const timer = setTimeout(() => ref.current?.focus(), 80);
      return () => clearTimeout(timer);
    }
  }, [active]);

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

  return (
    <input
      ref={ref}
      className="sr-only"
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
