/**
 * useKeyboardAvoidance.ts  ← CREATE NEW FILE
 * src/hooks/useKeyboardAvoidance.ts
 *
 * Fixes the Capacitor/WKWebView keyboard layout shift.
 * When the native keyboard opens on iOS:
 *   1. Sets --keyboard-height CSS var so grids can add padding
 *   2. Scrolls the focused input cell into view after a short delay
 *   3. Resets when keyboard closes
 *
 * Mount once inside each grid component that accepts text input:
 *   CrosswordGrid, FillInGrid, CryptogramPuzzle
 *
 * Usage:
 *   useKeyboardAvoidance();  // no args needed
 */

import { useEffect } from "react";

const ROOT = document.documentElement;

function setKeyboardHeight(px: number) {
  ROOT.style.setProperty("--keyboard-height", `${Math.round(px)}px`);
}

export function useKeyboardAvoidance() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return; // not available on desktop/old browsers — safe no-op

    const onResize = () => {
      // visualViewport.height shrinks when keyboard opens
      const kbHeight = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardHeight(kbHeight);

      if (kbHeight > 80) {
        // Keyboard is open — scroll active element into view
        // Delay matches iOS keyboard animation (~250ms)
        setTimeout(() => {
          const active = document.activeElement as HTMLElement | null;
          if (active && active !== document.body && active !== document.documentElement) {
            active.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 260);
      }
    };

    const onScroll = () => {
      // Prevent the page from scrolling up when keyboard opens
      // by pinning scroll to top (puzzles are fixed-layout, no scroll needed)
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    };

    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onScroll);

    // Also handle Capacitor keyboard plugin events if available
    const capKeyboard = (window as any)?.Capacitor?.Plugins?.Keyboard;
    if (capKeyboard) {
      capKeyboard.addListener?.("keyboardWillShow", (info: { keyboardHeight: number }) => {
        setKeyboardHeight(info.keyboardHeight);
      });
      capKeyboard.addListener?.("keyboardWillHide", () => {
        setKeyboardHeight(0);
      });
    }

    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onScroll);
      setKeyboardHeight(0);
    };
  }, []);
}
