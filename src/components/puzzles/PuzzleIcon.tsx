import type { PuzzleCategory } from "@/lib/puzzleTypes";

interface Props {
  type: PuzzleCategory;
  size?: number;
  className?: string;
}

/**
 * Redesigned puzzle icons — unified visual language across all 8 types.
 *
 * Design rules:
 * - Same 32×32 viewBox, same rx="3" outer container, same 0.3 opacity border
 * - Same primary accent: hsl(32 80% 50%) — matches --primary token
 * - Same highlight fill: hsl(32 80% 50% / 0.15)
 * - Max 3 visual elements per icon
 * - All text ≥ 5px font-size so it reads at 22px rendered size
 * - Each icon has a unique structural signature — instantly distinguishable
 */
const PuzzleIcon = ({ type, size = 32, className = "" }: Props) => {
  const HL = "hsl(32 80% 50%)";
  const HL_BG = "hsl(32 80% 50% / 0.15)";

  const svgProps = {
    width: size,
    height: size,
    viewBox: "0 0 32 32",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    className: `transition-opacity ${className}`,
    "aria-hidden": true as const,
  };

  // Shared: outer container rect used by all icons
  const Outer = ({ rx = 3 }: { rx?: number }) => (
    <rect x="4" y="4" width="24" height="24" rx={rx} stroke="currentColor" strokeWidth="1.5" opacity={0.3} />
  );

  // Shared: ghost grid lines (3×3 sections)
  const GridLines = () => (
    <>
      <line x1="4"  y1="12" x2="28" y2="12" stroke="currentColor" strokeWidth="0.6" opacity={0.2} />
      <line x1="4"  y1="20" x2="28" y2="20" stroke="currentColor" strokeWidth="0.6" opacity={0.2} />
      <line x1="12" y1="4"  x2="12" y2="28" stroke="currentColor" strokeWidth="0.6" opacity={0.2} />
      <line x1="20" y1="4"  x2="20" y2="28" stroke="currentColor" strokeWidth="0.6" opacity={0.2} />
    </>
  );

  switch (type) {

    // ── Crossword ──────────────────────────────────────────────────────────
    case "crossword":
      return (
        <svg {...svgProps}>
          <Outer />
          <rect x="4" y="4" width="24" height="8" fill={HL_BG} />
          <text x="10" y="9.5"  fontSize="5.5" fill={HL} textAnchor="middle" dominantBaseline="central" fontWeight="700" fontFamily="system-ui">W</text>
          <text x="18" y="9.5"  fontSize="5.5" fill={HL} textAnchor="middle" dominantBaseline="central" fontWeight="700" fontFamily="system-ui">O</text>
          <text x="26" y="9.5"  fontSize="5.5" fill={HL} textAnchor="middle" dominantBaseline="central" fontWeight="700" fontFamily="system-ui">R</text>
          <GridLines />
          <rect x="4"  y="20" width="8" height="8" rx="1" fill="currentColor" opacity={0.7} />
          <rect x="20" y="20" width="8" height="8" rx="1" fill="currentColor" opacity={0.7} />
        </svg>
      );

    // ── Sudoku ─────────────────────────────────────────────────────────────
    case "sudoku":
      return (
        <svg {...svgProps}>
          <Outer />
          <line x1="4"  y1="12" x2="28" y2="12" stroke="currentColor" strokeWidth="1.4" opacity={0.35} />
          <line x1="4"  y1="20" x2="28" y2="20" stroke="currentColor" strokeWidth="1.4" opacity={0.35} />
          <line x1="12" y1="4"  x2="12" y2="28" stroke="currentColor" strokeWidth="1.4" opacity={0.35} />
          <line x1="20" y1="4"  x2="20" y2="28" stroke="currentColor" strokeWidth="1.4" opacity={0.35} />
          <rect x="12" y="12" width="8" height="8" fill={HL_BG} />
          <text x="8"  y="8.5"  fontSize="5" fill="currentColor" opacity={0.5} textAnchor="middle" dominantBaseline="central" fontWeight="600" fontFamily="system-ui">5</text>
          <text x="24" y="8.5"  fontSize="5" fill="currentColor" opacity={0.5} textAnchor="middle" dominantBaseline="central" fontWeight="600" fontFamily="system-ui">3</text>
          <text x="8"  y="24.5" fontSize="5" fill="currentColor" opacity={0.5} textAnchor="middle" dominantBaseline="central" fontWeight="600" fontFamily="system-ui">1</text>
          <text x="24" y="24.5" fontSize="5" fill="currentColor" opacity={0.5} textAnchor="middle" dominantBaseline="central" fontWeight="600" fontFamily="system-ui">7</text>
          <text x="16" y="16.5" fontSize="6.5" fill={HL} textAnchor="middle" dominantBaseline="central" fontWeight="700" fontFamily="system-ui">4</text>
        </svg>
      );

    // ── Word Search ────────────────────────────────────────────────────────
    case "word-search":
      return (
        <svg {...svgProps}>
          <Outer />
          <rect x="4" y="10" width="24" height="7" rx="1" fill={HL_BG} />
          <text x="10" y="8"    fontSize="5" fill="currentColor" opacity={0.25} textAnchor="middle" dominantBaseline="central" fontFamily="system-ui">P</text>
          <text x="17" y="8"    fontSize="5" fill="currentColor" opacity={0.25} textAnchor="middle" dominantBaseline="central" fontFamily="system-ui">X</text>
          <text x="24" y="8"    fontSize="5" fill="currentColor" opacity={0.25} textAnchor="middle" dominantBaseline="central" fontFamily="system-ui">K</text>
          <text x="10" y="13.5" fontSize="5.5" fill={HL} textAnchor="middle" dominantBaseline="central" fontWeight="700" fontFamily="system-ui">F</text>
          <text x="17" y="13.5" fontSize="5.5" fill={HL} textAnchor="middle" dominantBaseline="central" fontWeight="700" fontFamily="system-ui">U</text>
          <text x="24" y="13.5" fontSize="5.5" fill={HL} textAnchor="middle" dominantBaseline="central" fontWeight="700" fontFamily="system-ui">N</text>
          <text x="10" y="21"   fontSize="5" fill="currentColor" opacity={0.25} textAnchor="middle" dominantBaseline="central" fontFamily="system-ui">M</text>
          <text x="17" y="21"   fontSize="5" fill="currentColor" opacity={0.25} textAnchor="middle" dominantBaseline="central" fontFamily="system-ui">R</text>
          <text x="24" y="21"   fontSize="5" fill="currentColor" opacity={0.25} textAnchor="middle" dominantBaseline="central" fontFamily="system-ui">Z</text>
          <text x="10" y="27"   fontSize="5" fill="currentColor" opacity={0.25} textAnchor="middle" dominantBaseline="central" fontFamily="system-ui">B</text>
          <text x="17" y="27"   fontSize="5" fill="currentColor" opacity={0.25} textAnchor="middle" dominantBaseline="central" fontFamily="system-ui">Q</text>
          <text x="24" y="27"   fontSize="5" fill="currentColor" opacity={0.25} textAnchor="middle" dominantBaseline="central" fontFamily="system-ui">W</text>
        </svg>
      );

    // ── Kakuro ─────────────────────────────────────────────────────────────
    case "kakuro":
      return (
        <svg {...svgProps}>
          <Outer />
          <rect x="4" y="4" width="12" height="12" rx="1.5" fill="currentColor" opacity={0.1} />
          <line x1="4" y1="4" x2="16" y2="16" stroke="currentColor" strokeWidth="1" opacity={0.3} />
          <text x="13" y="8"  fontSize="4.5" fill="currentColor" opacity={0.55} textAnchor="middle" dominantBaseline="central" fontWeight="600" fontFamily="system-ui">11</text>
          <text x="7"  y="13" fontSize="4.5" fill="currentColor" opacity={0.55} textAnchor="middle" dominantBaseline="central" fontWeight="600" fontFamily="system-ui">6</text>
          <rect x="4" y="16" width="12" height="12" rx="1.5" fill="currentColor" opacity={0.1} />
          <line x1="4" y1="16" x2="16" y2="28" stroke="currentColor" strokeWidth="1" opacity={0.3} />
          <text x="13" y="20" fontSize="4.5" fill="currentColor" opacity={0.55} textAnchor="middle" dominantBaseline="central" fontWeight="600" fontFamily="system-ui">7</text>
          <text x="7"  y="25" fontSize="4.5" fill="currentColor" opacity={0.55} textAnchor="middle" dominantBaseline="central" fontWeight="600" fontFamily="system-ui">3</text>
          <rect x="16" y="4" width="12" height="12" rx="1.5" fill={HL_BG} />
          <text x="22" y="10" fontSize="7" fill={HL} textAnchor="middle" dominantBaseline="central" fontWeight="700" fontFamily="system-ui">8</text>
          <rect x="16" y="16" width="12" height="12" rx="1.5" fill="currentColor" opacity={0.06} />
          <text x="22" y="22" fontSize="7" fill="currentColor" opacity={0.35} textAnchor="middle" dominantBaseline="central" fontWeight="600" fontFamily="system-ui">3</text>
        </svg>
      );

    // ── Nonogram ───────────────────────────────────────────────────────────
    case "nonogram":
      return (
        <svg {...svgProps}>
          <Outer />
          <rect x="8"  y="8"  width="4" height="4" rx="0.5" fill="currentColor" opacity={0.08} />
          <rect x="12" y="8"  width="4" height="4" rx="0.5" fill="currentColor" opacity={0.08} />
          <rect x="16" y="8"  width="4" height="4" rx="0.5" fill="currentColor" opacity={0.08} />
          <rect x="20" y="8"  width="4" height="4" rx="0.5" fill="currentColor" opacity={0.08} />
          <rect x="8"  y="14" width="4" height="4" rx="0.5" fill="currentColor" opacity={0.08} />
          <rect x="12" y="14" width="4" height="4" rx="0.5" fill="currentColor" opacity={0.08} />
          <rect x="16" y="14" width="4" height="4" rx="0.5" fill="currentColor" opacity={0.08} />
          <rect x="20" y="14" width="4" height="4" rx="0.5" fill="currentColor" opacity={0.08} />
          <rect x="8"  y="20" width="4" height="4" rx="0.5" fill="currentColor" opacity={0.08} />
          <rect x="12" y="20" width="4" height="4" rx="0.5" fill="currentColor" opacity={0.08} />
          <rect x="16" y="20" width="4" height="4" rx="0.5" fill="currentColor" opacity={0.08} />
          <rect x="20" y="20" width="4" height="4" rx="0.5" fill="currentColor" opacity={0.08} />
          <rect x="8"  y="8"  width="4" height="4" rx="0.5" fill={HL} opacity={0.85} />
          <rect x="20" y="8"  width="4" height="4" rx="0.5" fill={HL} opacity={0.85} />
          <rect x="8"  y="20" width="4" height="4" rx="0.5" fill={HL} opacity={0.85} />
          <rect x="12" y="20" width="4" height="4" rx="0.5" fill={HL} opacity={0.85} />
          <rect x="16" y="20" width="4" height="4" rx="0.5" fill={HL} opacity={0.85} />
          <rect x="20" y="20" width="4" height="4" rx="0.5" fill={HL} opacity={0.85} />
        </svg>
      );

    // ── Cryptogram ─────────────────────────────────────────────────────────
    case "cryptogram":
      return (
        <svg {...svgProps}>
          <Outer />
          <text x="9"  y="9" fontSize="3.5" fill="currentColor" opacity={0.28} textAnchor="middle" dominantBaseline="central" fontFamily="monospace">XK</text>
          <text x="23" y="9" fontSize="3.5" fill="currentColor" opacity={0.28} textAnchor="middle" dominantBaseline="central" fontFamily="monospace">QP</text>
          <rect x="10" y="15" width="12" height="10" rx="2" fill="currentColor" opacity={0.12} />
          <rect x="10" y="15" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.2" opacity={0.35} />
          <path d="M12 15v-3a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity={0.4} />
          <circle cx="16" cy="19.5" r="1.8" fill={HL} opacity={0.9} />
          <line x1="16" y1="21.3" x2="16" y2="23.5" stroke={HL} strokeWidth="1.4" strokeLinecap="round" opacity={0.9} />
        </svg>
      );

    // ── Word Fill-In ───────────────────────────────────────────────────────
    case "word-fill":
      return (
        <svg {...svgProps}>
          <Outer />
          <GridLines />
          <rect x="12" y="4" width="8" height="24" rx="1" fill={HL_BG} />
          <text x="16" y="8.5"  fontSize="5.5" fill={HL} textAnchor="middle" dominantBaseline="central" fontWeight="700" fontFamily="system-ui">P</text>
          <text x="16" y="16"   fontSize="5.5" fill={HL} textAnchor="middle" dominantBaseline="central" fontWeight="700" fontFamily="system-ui">U</text>
          <text x="16" y="23.5" fontSize="5.5" fill={HL} textAnchor="middle" dominantBaseline="central" fontWeight="700" fontFamily="system-ui">N</text>
          <rect x="4"  y="4"  width="8" height="8" rx="1" fill="currentColor" opacity={0.7} />
          <rect x="20" y="20" width="8" height="8" rx="1" fill="currentColor" opacity={0.7} />
        </svg>
      );

    // ── Number Fill-In ─────────────────────────────────────────────────────
    case "number-fill":
      return (
        <svg {...svgProps}>
          <Outer />
          <GridLines />
          <rect x="4" y="4" width="16" height="8" rx="1" fill={HL_BG} />
          <text x="8"  y="8.5" fontSize="6" fill={HL} textAnchor="middle" dominantBaseline="central" fontWeight="700" fontFamily="system-ui">4</text>
          <text x="16" y="8.5" fontSize="6" fill={HL} textAnchor="middle" dominantBaseline="central" fontWeight="700" fontFamily="system-ui">7</text>
          <rect x="20" y="4" width="8" height="8" rx="1" fill="currentColor" opacity={0.7} />
          <text x="22" y="16" fontSize="6" fill="currentColor" opacity={0.3} textAnchor="middle" dominantBaseline="central" fontWeight="600" fontFamily="system-ui">2</text>
          <text x="16" y="24" fontSize="6" fill="currentColor" opacity={0.3} textAnchor="middle" dominantBaseline="central" fontWeight="600" fontFamily="system-ui">9</text>
          <rect x="4" y="20" width="8" height="8" rx="1" fill="currentColor" opacity={0.7} />
        </svg>
      );

    default:
      return null;
  }
};

export default PuzzleIcon;
