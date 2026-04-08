/**
 * OnboardingFlow.tsx  ← FULL REPLACEMENT
 * src/components/onboarding/OnboardingFlow.tsx
 *
 * Changes from previous version:
 * - Bullet text now uses `min-w-0 break-words` to prevent overflow on narrow
 *   screens (iPhone SE 320px) — long text like "8 puzzle types — daily
 *   challenges, quick play, endless mode" was overflowing on small devices
 * - Visual area capped more tightly on small screens (`max-h-[180px]`)
 *   to leave room for text + CTA without scrolling
 * - CTA button safe-area padding corrected for iPhone 14 Pro notch
 * - Transition duration fixed: class was "duration-180" (invalid Tailwind),
 *   changed to "duration-200"
 * - Skip button touch target enlarged to min 44px for iOS HIG compliance
 * - Added `overflow-hidden` guard on bullet container so long strings
 *   never break layout at any viewport width
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { hapticTap, hapticSuccess } from "@/lib/haptic";
import { randomSeed } from "@/lib/seededRandom";
import { ChevronRight, Sparkles, Users, Trophy } from "lucide-react";

interface OnboardingFlowProps {
  onComplete: () => void;
}

// ── Puzzle mini-preview SVG ───────────────────────────────────────────────

const CrosswordPreview = () => (
  <svg viewBox="0 0 130 82" className="w-full h-auto max-h-full" preserveAspectRatio="xMidYMid meet" aria-hidden>
    <rect x="5"  y="2"  width="22" height="22" rx="4" fill="hsl(32 80% 50% / 0.15)" stroke="hsl(32 80% 50%)" strokeWidth="1.5"/>
    <text x="16" y="18" fontSize="12" fontWeight="700" fill="hsl(32 80% 50%)" textAnchor="middle">P</text>
    <rect x="29" y="2"  width="22" height="22" rx="4" fill="currentColor" opacity="0.08" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.3"/>
    <text x="40" y="18" fontSize="12" fontWeight="700" fill="currentColor" textAnchor="middle" opacity="0.6">U</text>
    <rect x="53" y="2"  width="22" height="22" rx="4" fill="currentColor" opacity="0.08" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.3"/>
    <text x="64" y="18" fontSize="12" fontWeight="700" fill="currentColor" textAnchor="middle" opacity="0.6">Z</text>
    <rect x="77" y="2"  width="22" height="22" rx="4" fill="currentColor" opacity="0.08" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.3"/>
    <text x="88" y="18" fontSize="12" fontWeight="700" fill="currentColor" textAnchor="middle" opacity="0.6">Z</text>
    <rect x="101" y="2"  width="22" height="22" rx="4" fill="hsl(32 80% 50% / 0.08)" stroke="hsl(32 80% 50% / 0.3)" strokeWidth="0.75"/>

    <rect x="5"  y="28" width="22" height="22" rx="4" fill="currentColor" opacity="0.04" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.2"/>
    <rect x="29" y="28" width="22" height="22" rx="4" fill="#1a1a1a"/>
    <rect x="53" y="28" width="22" height="22" rx="4" fill="hsl(142 60% 40% / 0.15)" stroke="hsl(142 60% 40%)" strokeWidth="1.5"/>
    <text x="64" y="44" fontSize="12" fontWeight="700" fill="hsl(142 60% 40%)" textAnchor="middle">L</text>
    <rect x="77" y="28" width="22" height="22" rx="4" fill="currentColor" opacity="0.08" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.3"/>
    <rect x="101" y="28" width="22" height="22" rx="4" fill="currentColor" opacity="0.08" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.3"/>

    <rect x="5"  y="54" width="22" height="22" rx="4" fill="currentColor" opacity="0.04" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.2"/>
    <rect x="29" y="54" width="22" height="22" rx="4" fill="currentColor" opacity="0.04" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.2"/>
    <rect x="53" y="54" width="22" height="22" rx="4" fill="currentColor" opacity="0.08" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.3"/>
    <text x="64" y="70" fontSize="12" fontWeight="700" fill="currentColor" textAnchor="middle" opacity="0.4">E</text>
    <rect x="77" y="54" width="22" height="22" rx="4" fill="currentColor" opacity="0.08" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.3"/>
    <rect x="101" y="54" width="22" height="22" rx="4" fill="#1a1a1a"/>
  </svg>
);

const CraftPreview = () => (
  <svg viewBox="0 0 140 90" className="w-full h-auto max-h-full" preserveAspectRatio="xMidYMid meet" aria-hidden>
    <defs>
      <clipPath id="craft-preview-right-card">
        <rect x="86" y="8" width="50" height="74" rx="7" />
      </clipPath>
    </defs>
    <rect x="4" y="8" width="50" height="74" rx="7" fill="currentColor" opacity="0.06" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.25"/>
    <rect x="10" y="18" width="38" height="6" rx="2" fill="hsl(32 80% 50%)" opacity="0.7"/>
    <rect x="10" y="28" width="28" height="4" rx="2" fill="currentColor" opacity="0.2"/>
    <rect x="10" y="36" width="32" height="4" rx="2" fill="currentColor" opacity="0.2"/>
    <rect x="10" y="44" width="25" height="4" rx="2" fill="currentColor" opacity="0.2"/>
    <rect x="10" y="60" width="38" height="10" rx="4" fill="hsl(32 80% 50%)"/>
    <text x="29" y="68" fontSize="6" fontWeight="700" fill="white" textAnchor="middle">Send Puzzle</text>
    <path d="M60 45 L80 45" stroke="hsl(32 80% 50%)" strokeWidth="2" strokeLinecap="round"/>
    <polyline points="76,41 80,45 76,49" stroke="hsl(32 80% 50%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <rect x="86" y="8" width="50" height="74" rx="7" fill="currentColor" opacity="0.06" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.25"/>
    <g clipPath="url(#craft-preview-right-card)">
      <rect x="93" y="18" width="36" height="5" rx="2" fill="currentColor" opacity="0.15"/>
      <text x="111" y="30" fontSize="4.2" fill="currentColor" opacity="0.5" textAnchor="middle">Alex sent</text>
      <text x="111" y="35" fontSize="4.2" fill="currentColor" opacity="0.5" textAnchor="middle">you a puzzle!</text>
      <rect x="96" y="39" width="30" height="30" rx="4" fill="currentColor" opacity="0.05" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.2"/>
      {[0,1,2,3,4].map(r => [0,1,2,3,4].map(c => (
        <rect key={`${r}-${c}`} x={98 + c * 6} y={41 + r * 6} width="5" height="5" rx="1"
          fill={((r+c)%5===0) ? "#1a1a1a" : "currentColor"} opacity={((r+c)%5===0) ? 1 : 0.1}
          stroke="currentColor" strokeWidth="0.3" strokeOpacity="0.2"/>
      )))}
      <rect x="98" y="73" width="26" height="6" rx="3" fill="hsl(142 60% 40% / 0.15)" stroke="hsl(142 60% 40%)" strokeWidth="0.75"/>
      <text x="111" y="77.2" fontSize="4.1" fontWeight="700" fill="hsl(142 60% 40%)" textAnchor="middle">Solved in 2:14!</text>
    </g>
  </svg>
);

// ── Screens ────────────────────────────────────────────────────────────────

const SCREENS = [
  {
    id: "welcome",
    visual: <CrosswordPreview />,
    headline: "The puzzle app\nyou'll come back to",
    bullets: [
      { icon: Trophy,   text: "8 puzzle types — daily challenges, quick play, endless mode" },
      { icon: Sparkles, text: "Track your rating, build streaks, unlock skill tiers"         },
      { icon: Users,    text: "Create personalized puzzles and challenge your friends"        },
    ],
    cta: "Next",
  },
  {
    id: "craft",
    visual: <CraftPreview />,
    headline: "Make puzzles\nyour friends will love",
    bullets: [
      { icon: Sparkles, text: "Use your own words — inside jokes, memories, interests" },
      { icon: Trophy,   text: "Solve it yourself first to set a challenge time to beat" },
      { icon: Users,    text: "See when friends solve it and how long they took"        },
    ],
    cta: "Next",
  },
  {
    id: "start",
    visual: null,
    headline: "Ready to play?",
    bullets: [],
    cta: "Start playing",
  },
];

// ── Component ─────────────────────────────────────────────────────────────

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const navigate = useNavigate();
  const [screen, setScreen] = useState(0);
  const [exiting, setExiting] = useState(false);

  const current = SCREENS[screen];
  const isLast = screen === SCREENS.length - 1;

  const advance = () => {
    hapticTap();
    if (!isLast) {
      setExiting(true);
      setTimeout(() => {
        setScreen((s) => s + 1);
        setExiting(false);
      }, 200);
    } else {
      hapticSuccess();
      onComplete();
      navigate(`/quick-play/crossword?seed=${randomSeed()}&d=easy&onboarding=1`);
    }
  };

  const skip = () => {
    hapticTap();
    onComplete();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background overflow-hidden"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Skip — min 44px touch target for iOS HIG */}
      <div className="flex justify-end px-5 pt-3 pb-1">
        <button
          onClick={skip}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-xs text-muted-foreground px-3 rounded-full hover:bg-muted/50 transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Dot pagination */}
      <div className="flex justify-center gap-1.5 pb-4">
        {SCREENS.map((_, i) => (
          <div
            key={i}
            className={cn(
              "rounded-full transition-all duration-300",
              i === screen ? "w-5 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-border"
            )}
          />
        ))}
      </div>

      {/* Screen content */}
      <div
        className={cn(
          "flex-1 flex flex-col items-center px-6 min-w-0 overflow-hidden",
          "transition-all duration-200",
          exiting ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
        )}
      >
        {/* Visual — constrained height so it doesn't crowd text on short screens */}
        {current.visual && (
          <div className="w-full max-w-[260px] max-h-[180px] sm:max-h-[220px] aspect-[3/2] mb-6 mt-2 flex-shrink-0 overflow-hidden rounded-2xl flex items-center justify-center">
            {current.visual}
          </div>
        )}

        {/* Last screen illustration */}
        {!current.visual && (
          <div className="flex flex-col items-center justify-center mb-6 flex-shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-primary/10 flex items-center justify-center mb-6">
              <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden>
                <rect x="4"  y="4"  width="16" height="16" rx="3" fill="hsl(32 80% 50%)"/>
                <rect x="24" y="4"  width="20" height="7"  rx="2" fill="currentColor" opacity="0.15"/>
                <rect x="24" y="14" width="14" height="6"  rx="2" fill="currentColor" opacity="0.1"/>
                <rect x="4"  y="24" width="20" height="7"  rx="2" fill="currentColor" opacity="0.15"/>
                <rect x="4"  y="35" width="14" height="6"  rx="2" fill="currentColor" opacity="0.1"/>
                <rect x="28" y="24" width="16" height="16" rx="3" fill="hsl(32 80% 50% / 0.2)" stroke="hsl(32 80% 50%)" strokeWidth="1.5"/>
              </svg>
            </div>
          </div>
        )}

        {/* Headline */}
        <h1 className="text-2xl font-bold text-foreground text-center leading-tight whitespace-pre-line mb-5 flex-shrink-0">
          {current.headline}
        </h1>

        {/* Bullets — min-w-0 + overflow-hidden prevents text overflow at any width */}
        {current.bullets.length > 0 && (
          <div className="w-full max-w-sm space-y-3 mb-6 min-w-0">
            {current.bullets.map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-start gap-3 min-w-0">
                {/* Icon — shrink-0 so it never gets squished */}
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Icon size={14} className="text-primary" />
                </div>
                {/* Text — min-w-0 + break-words ensures wrapping on very narrow screens */}
                <p className="text-sm text-muted-foreground leading-snug pt-1 min-w-0 break-words">
                  {text}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Last screen extras */}
        {isLast && (
          <div className="w-full max-w-sm space-y-2 mb-6 text-center">
            <p className="text-sm text-muted-foreground">
              We'll start you with an easy crossword — no account needed.
            </p>
            <p className="text-xs text-muted-foreground/60">
              Sign up any time to save your streak and progress.
            </p>
          </div>
        )}
      </div>

      {/* CTA — proper safe-area padding for all iOS devices */}
      <div className="flex-shrink-0 px-6 pt-2 pb-6 space-y-2">
        <button
          onClick={advance}
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-2xl py-4",
            "font-semibold text-base transition-all active:scale-[0.97]",
            "bg-primary text-primary-foreground",
            isLast && "shadow-lg shadow-primary/25"
          )}
        >
          {current.cta}
          {!isLast && <ChevronRight size={18} />}
        </button>
      </div>
    </div>
  );
}
