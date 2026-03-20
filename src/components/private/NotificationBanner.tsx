import { useState, useEffect, useCallback } from "react";

interface NotificationBannerProps {
  /** The phrase to display */
  phrase: string | null;
  /** Called when banner finishes dismissing */
  onDismissed?: () => void;
}

/**
 * Subtle in-app notification banner — slides in from top, auto-dismisses after 3s.
 * Used when user is on-site but not in the conversation thread.
 */
export function NotificationBanner({ phrase, onDismissed }: NotificationBannerProps) {
  const [visible, setVisible] = useState(false);
  const [currentPhrase, setCurrentPhrase] = useState<string | null>(null);

  useEffect(() => {
    if (phrase) {
      setCurrentPhrase(phrase);
      setVisible(true);

      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => {
          setCurrentPhrase(null);
          onDismissed?.();
        }, 300); // wait for fade-out
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [phrase, onDismissed]);

  if (!currentPhrase) return null;

  return (
    <div
      className={`fixed top-3 left-1/2 -translate-x-1/2 z-[80] transition-all duration-300 ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-2 pointer-events-none"
      }`}
    >
      <div className="rounded-xl border border-border/50 bg-card/95 backdrop-blur-sm px-4 py-2.5 shadow-lg">
        <p className="text-sm text-foreground/90 whitespace-nowrap">
          {currentPhrase}
        </p>
      </div>
    </div>
  );
}
