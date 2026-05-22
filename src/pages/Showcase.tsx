/**
 * Showcase.tsx
 * src/pages/Showcase.tsx
 *
 * Cinematic product-trailer landing for Puzzlecraft.
 * Designed to be screen-recorded: each section opens with a dramatic
 * still, holds a beat, then introduces a single motion detail.
 */

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "@/styles/showcase.css";

// ── Reveal hook ──────────────────────────────────────────────────────────────
function useReveal<T extends HTMLElement>(threshold = 0.18) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ── Phone frame ──────────────────────────────────────────────────────────────
function Phone({
  children,
  className = "",
  tilt = 0,
}: {
  children: React.ReactNode;
  className?: string;
  tilt?: number;
}) {
  return (
    <div
      className={`sc-phone ${className}`}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      <div className="sc-phone-frame">
        <div className="sc-phone-notch" />
        <div className="sc-phone-screen">{children}</div>
      </div>
    </div>
  );
}

// ── Mini screens ─────────────────────────────────────────────────────────────
function DailyScreen() {
  const days = Array.from({ length: 28 }, (_, i) => i);
  const todayIndex = 17;
  return (
    <div className="sc-screen">
      <div className="sc-screen-eyebrow">November</div>
      <div className="sc-daily-grid">
        {days.map((i) => (
          <div
            key={i}
            className={`sc-daily-cell ${
              i < todayIndex ? "is-done" : i === todayIndex ? "is-today" : ""
            }`}
          />
        ))}
      </div>
      <div className="sc-screen-foot">Today’s puzzle</div>
    </div>
  );
}

function StreakScreen() {
  return (
    <div className="sc-screen sc-streak">
      <div className="sc-flame">
        <div className="sc-flame-glow" />
        <div className="sc-flame-num">42</div>
        <div className="sc-flame-label">day streak</div>
      </div>
      <div className="sc-week">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={`${d}-${i}`} className="sc-week-day">
            <span className={`sc-week-dot ${i < 5 ? "is-on" : ""}`} />
            <span>{d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SolveScreen() {
  const cells = Array.from({ length: 25 }, (_, i) => i);
  const blacks = new Set([2, 6, 10, 14, 18, 22]);
  return (
    <div className="sc-screen">
      <div className="sc-screen-eyebrow">Crossword · Daily</div>
      <div className="sc-solve-grid">
        {cells.map((i) => (
          <div
            key={i}
            className={`sc-solve-cell ${blacks.has(i) ? "is-black" : "sc-glow-cell"}`}
            style={{ animationDelay: `${(i % 12) * 0.18}s` }}
          />
        ))}
      </div>
      <div className="sc-screen-foot">02:14</div>
    </div>
  );
}

function LeaderboardScreen() {
  const rows = [
    { n: "Avery K.", t: "1:42" },
    { n: "Jordan M.", t: "1:58" },
    { n: "You", t: "2:04", you: true },
    { n: "Sam P.", t: "2:11" },
    { n: "Riley T.", t: "2:27" },
  ];
  return (
    <div className="sc-screen">
      <div className="sc-screen-eyebrow">Today · Crossword</div>
      <div className="sc-lb-list">
        {rows.map((r, i) => (
          <div key={i} className={`sc-lb-row ${r.you ? "is-you" : ""}`}>
            <span className="sc-lb-rank">{i + 1}</span>
            <span className="sc-lb-name">{r.n}</span>
            <span className="sc-lb-time">{r.t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShareScreen() {
  return (
    <div className="sc-screen sc-share">
      <div className="sc-share-card">
        <div className="sc-share-grid">
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              className={`sc-share-px ${i % 3 === 0 ? "is-lit" : ""}`}
            />
          ))}
        </div>
        <div>
          <div className="sc-share-title">Solved in 2:04</div>
          <div className="sc-share-sub">Puzzlecraft · Daily</div>
        </div>
      </div>
    </div>
  );
}

// ── Section wrapper ──────────────────────────────────────────────────────────
function Act({
  kicker,
  title,
  titleItalic,
  sub,
  children,
  align = "left",
}: {
  kicker: string;
  title: string;
  titleItalic?: string;
  sub: string;
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  const { ref, visible } = useReveal<HTMLElement>(0.18);
  return (
    <section
      ref={ref}
      className={`sc-act sc-act-${align} ${visible ? "is-in" : ""}`}
    >
      <div className="sc-orb sc-orb-a" />
      <div className="sc-orb sc-orb-b" />
      <div className="sc-act-inner">
        <div className="sc-copy">
          <div className="sc-kicker">{kicker}</div>
          <h2 className="sc-title">
            {title}
            {titleItalic && (
              <>
                {" "}
                <span className="sc-hero-italic">{titleItalic}</span>
              </>
            )}
          </h2>
          <p className="sc-sub">{sub}</p>
        </div>
        <div className="sc-stage">{children}</div>
      </div>
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Showcase() {
  useEffect(() => {
    const prevBg = document.body.style.background;
    document.body.style.background = "#050505";
    return () => {
      document.body.style.background = prevBg;
    };
  }, []);

  const hero = useReveal<HTMLDivElement>(0.05);

  return (
    <div className="sc-root">
      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section className="sc-hero">
        <div className="sc-orb-hero" />
        <div
          ref={hero.ref}
          className={`sc-hero-inner ${hero.visible ? "is-in" : ""}`}
        >
          <div className="sc-kicker sc-hero-kicker">Puzzlecraft</div>
          <h1 className="sc-hero-title">
            Puzzles,
            <br />
            <span className="sc-hero-italic">reimagined.</span>
          </h1>
          <p className="sc-hero-sub">A daily ritual. Beautifully crafted.</p>
          <div className="sc-hero-phone">
            <Phone>
              <SolveScreen />
            </Phone>
          </div>
        </div>
        <div className="sc-scroll-hint" aria-hidden />
      </section>

      {/* ── DAILY ──────────────────────────────────────────────────────── */}
      <Act
        kicker="Daily"
        title="One puzzle."
        titleItalic="Every day."
        sub="A new ritual at midnight."
      >
        <Phone tilt={-3}>
          <DailyScreen />
        </Phone>
      </Act>

      {/* ── STREAK ─────────────────────────────────────────────────────── */}
      <Act
        kicker="Streak"
        title="Show up."
        titleItalic="Keep going."
        sub="Days, weeks, months — quietly counted."
        align="right"
      >
        <Phone tilt={3}>
          <StreakScreen />
        </Phone>
      </Act>

      {/* ── SOLVE ──────────────────────────────────────────────────────── */}
      <Act
        kicker="Solve"
        title="Slow down."
        titleItalic="Think clearly."
        sub="A canvas for quiet focus."
      >
        <Phone tilt={-2}>
          <SolveScreen />
        </Phone>
      </Act>

      {/* ── LEADERBOARDS ───────────────────────────────────────────────── */}
      <Act
        kicker="Compete"
        title="Quietly"
        titleItalic="competitive."
        sub="See where your time lands."
        align="right"
      >
        <Phone tilt={2}>
          <LeaderboardScreen />
        </Phone>
      </Act>

      {/* ── SOCIAL SHARING ─────────────────────────────────────────────── */}
      <Act
        kicker="Share"
        title="Made to be"
        titleItalic="passed on."
        sub="Create a puzzle. Send the moment."
      >
        <div className="sc-share-stack">
          <Phone tilt={-6} className="sc-back-phone">
            <SolveScreen />
          </Phone>
          <Phone tilt={4} className="sc-front-phone">
            <ShareScreen />
          </Phone>
        </div>
      </Act>

      {/* ── CTA FOOTER ─────────────────────────────────────────────────── */}
      <section className="sc-cta">
        <div className="sc-cta-inner">
          <div className="sc-kicker">Puzzlecraft</div>
          <h2 className="sc-cta-title">
            Modern puzzles,
            <br />
            <span className="sc-hero-italic">beautifully designed.</span>
          </h2>
          <Link to="/" className="sc-cta-btn">
            Begin
          </Link>
        </div>
      </section>
    </div>
  );
}
