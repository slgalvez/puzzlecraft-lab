import { useRef, useImperativeHandle, forwardRef, useCallback } from "react";

interface Props {
  active: boolean;
  onLetter: (letter: string) => void;
  onDelete: () => void;
  inputMode?: "text" | "numeric";
}

export interface MobileLetterInputHandle {
  focus: () => void;
}

/**
 * Hidden input that triggers the mobile keyboard when a cell is active.
 * Parent components MUST call .focus() directly inside their click/tap handler
 * so that mobile Safari treats it as a user-gesture-initiated focus.
 */
const MobileLetterInput = forwardRef<MobileLetterInputHandle, Props>(
  ({ active, onLetter, onDelete, inputMode = "text" }, fwdRef) => {
    const ref = useRef<HTMLInputElement>(null);

    useImperativeHandle(fwdRef, () => ({
      focus() {
        ref.current?.focus({ preventScroll: true });
      },
    }));

    const handleInput = useCallback((e: React.FormEvent<HTMLInputElement>) => {
      const value = (e.target as HTMLInputElement).value;
      if (!value) return;
      const char = value.slice(-1).toUpperCase();
      if (inputMode === "numeric" && /^[0-9]$/.test(char)) {
        onLetter(char);
      } else if (inputMode === "text" && /^[A-Z]$/.test(char)) {
        onLetter(char);
      }
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
          top: "50%",
          left: "50%",
          opacity: 0.01,
          width: "2px",
          height: "2px",
          border: "none",
          padding: 0,
          margin: 0,
          pointerEvents: "auto",
          zIndex: 9999,
          fontSize: "16px",
        }}
        inputMode={inputMode === "numeric" ? "numeric" : "text"}
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        enterKeyHint="done"
        aria-hidden="true"
      />
    );
  }
);

MobileLetterInput.displayName = "MobileLetterInput";

export default MobileLetterInput;
