import type { PuzzleCategory } from "@/lib/puzzleTypes";

interface Props {
  type: PuzzleCategory;
  size?: number;
  className?: string;
}

const PuzzleIcon = ({ type, size = 32, className = "" }: Props) => {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 32 32",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    className,
    "aria-hidden": true as const,
  };

  switch (type) {
    // Crossword: 5×5 grid with black/white cells
    case "crossword":
      return (
        <svg {...props}>
          <rect x="2" y="2" width="28" height="28" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
          {/* Grid lines */}
          {[7.6, 13.2, 18.8, 24.4].map((v) => (
            <line key={`h${v}`} x1="2" y1={v} x2="30" y2={v} stroke="currentColor" strokeWidth="0.5" opacity="0.15" />
          ))}
          {[7.6, 13.2, 18.8, 24.4].map((v) => (
            <line key={`v${v}`} x1={v} y1="2" x2={v} y2="30" stroke="currentColor" strokeWidth="0.5" opacity="0.15" />
          ))}
          {/* Black cells */}
          <rect x="2" y="24.4" width="5.6" height="5.6" fill="currentColor" opacity="0.7" />
          <rect x="13.2" y="13.2" width="5.6" height="5.6" fill="currentColor" opacity="0.7" />
          <rect x="24.4" y="2" width="5.6" height="5.6" rx="0 2 0 0" fill="currentColor" opacity="0.7" />
          <rect x="24.4" y="7.6" width="5.6" height="5.6" fill="currentColor" opacity="0.7" />
          <rect x="2" y="18.8" width="5.6" height="5.6" fill="currentColor" opacity="0.7" />
          {/* Cell numbers */}
          <text x="3.5" y="5.8" fontSize="3" fill="currentColor" opacity="0.5" fontFamily="system-ui">1</text>
          <text x="9.1" y="5.8" fontSize="3" fill="currentColor" opacity="0.5" fontFamily="system-ui">2</text>
          <text x="14.7" y="5.8" fontSize="3" fill="currentColor" opacity="0.5" fontFamily="system-ui">3</text>
        </svg>
      );

    // Sudoku: 3×3 blocks with partial numbers
    case "sudoku":
      return (
        <svg {...props}>
          <rect x="2" y="2" width="28" height="28" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
          {/* 3×3 block dividers */}
          <line x1="11.33" y1="2" x2="11.33" y2="30" stroke="currentColor" strokeWidth="1.2" opacity="0.35" />
          <line x1="20.67" y1="2" x2="20.67" y2="30" stroke="currentColor" strokeWidth="1.2" opacity="0.35" />
          <line x1="2" y1="11.33" x2="30" y2="11.33" stroke="currentColor" strokeWidth="1.2" opacity="0.35" />
          <line x1="2" y1="20.67" x2="30" y2="20.67" stroke="currentColor" strokeWidth="1.2" opacity="0.35" />
          {/* Thin cell lines */}
          {[5.11, 8.22, 14.44, 17.55, 23.78, 26.89].map((v) => (
            <line key={`sh${v}`} x1="2" y1={v} x2="30" y2={v} stroke="currentColor" strokeWidth="0.4" opacity="0.12" />
          ))}
          {[5.11, 8.22, 14.44, 17.55, 23.78, 26.89].map((v) => (
            <line key={`sv${v}`} x1={v} y1="2" x2={v} y2="30" stroke="currentColor" strokeWidth="0.4" opacity="0.12" />
          ))}
          {/* A few numbers */}
          <text x="5.5" y="8.5" fontSize="4.5" fill="currentColor" opacity="0.65" fontFamily="system-ui" textAnchor="middle">5</text>
          <text x="15" y="18" fontSize="4.5" fill="currentColor" opacity="0.65" fontFamily="system-ui" textAnchor="middle">3</text>
          <text x="24.5" y="8.5" fontSize="4.5" fill="currentColor" opacity="0.65" fontFamily="system-ui" textAnchor="middle">8</text>
          <text x="8.5" y="24.5" fontSize="4.5" fill="currentColor" opacity="0.4" fontFamily="system-ui" textAnchor="middle">1</text>
          <text x="21.5" y="27.5" fontSize="4.5" fill="currentColor" opacity="0.65" fontFamily="system-ui" textAnchor="middle">7</text>
        </svg>
      );

    // Word Search: letter grid with highlighted diagonal
    case "word-search":
      return (
        <svg {...props}>
          <rect x="2" y="2" width="28" height="28" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
          {/* Highlight path — diagonal */}
          <line x1="5" y1="7" x2="21" y2="23" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" opacity="0.12" />
          {/* Letters */}
          {[
            ["A", 6, 9], ["R", 11, 9], ["T", 16, 9], ["X", 21, 9], ["M", 26, 9],
            ["K", 6, 14], ["I", 11, 14], ["N", 16, 14], ["D", 21, 14], ["E", 26, 14],
            ["P", 6, 19], ["L", 11, 19], ["A", 16, 19], ["Y", 21, 19], ["S", 26, 19],
            ["G", 6, 24], ["O", 11, 24], ["B", 16, 24], ["W", 21, 24], ["Z", 26, 24],
          ].map(([letter, x, y], i) => (
            <text key={i} x={x as number} y={y as number} fontSize="3.8" fill="currentColor"
              opacity={[0, 5, 10, 15].includes(i) ? 0.6 : 0.25}
              fontFamily="system-ui" textAnchor="middle"
              fontWeight={[0, 5, 10, 15].includes(i) ? 600 : 400}>
              {letter as string}
            </text>
          ))}
        </svg>
      );

    // Kakuro: grid with diagonal clue cells
    case "kakuro":
      return (
        <svg {...props}>
          <rect x="2" y="2" width="28" height="28" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
          {/* Black/clue cells */}
          <rect x="2" y="2" width="9.33" height="9.33" fill="currentColor" opacity="0.08" />
          <rect x="2" y="11.33" width="9.33" height="9.33" fill="currentColor" opacity="0.08" />
          <rect x="2" y="20.67" width="9.33" height="9.33" fill="currentColor" opacity="0.08" />
          {/* Diagonal lines in clue cells */}
          <line x1="2" y1="2" x2="11.33" y2="11.33" stroke="currentColor" strokeWidth="0.7" opacity="0.3" />
          <line x1="2" y1="11.33" x2="11.33" y2="20.67" stroke="currentColor" strokeWidth="0.7" opacity="0.3" />
          {/* Clue numbers */}
          <text x="8" y="6.5" fontSize="3.2" fill="currentColor" opacity="0.5" fontFamily="system-ui" textAnchor="middle">16</text>
          <text x="5" y="9.8" fontSize="3.2" fill="currentColor" opacity="0.5" fontFamily="system-ui" textAnchor="middle">9</text>
          <text x="8" y="15.8" fontSize="3.2" fill="currentColor" opacity="0.5" fontFamily="system-ui" textAnchor="middle">7</text>
          <text x="5" y="19" fontSize="3.2" fill="currentColor" opacity="0.5" fontFamily="system-ui" textAnchor="middle">3</text>
          {/* Grid lines */}
          <line x1="11.33" y1="2" x2="11.33" y2="30" stroke="currentColor" strokeWidth="0.7" opacity="0.2" />
          <line x1="20.67" y1="2" x2="20.67" y2="30" stroke="currentColor" strokeWidth="0.7" opacity="0.2" />
          <line x1="2" y1="11.33" x2="30" y2="11.33" stroke="currentColor" strokeWidth="0.7" opacity="0.2" />
          <line x1="2" y1="20.67" x2="30" y2="20.67" stroke="currentColor" strokeWidth="0.7" opacity="0.2" />
          {/* White cell numbers */}
          <text x="16" y="8.5" fontSize="4" fill="currentColor" opacity="0.45" fontFamily="system-ui" textAnchor="middle">9</text>
          <text x="25.3" y="18" fontSize="4" fill="currentColor" opacity="0.45" fontFamily="system-ui" textAnchor="middle">2</text>
        </svg>
      );

    // Nonogram: grid with row/column clue indicators
    case "nonogram":
      return (
        <svg {...props}>
          {/* Clue area - top */}
          <rect x="10" y="2" width="20" height="8" rx="1" fill="currentColor" opacity="0.04" />
          {/* Clue area - left */}
          <rect x="2" y="10" width="8" height="20" rx="1" fill="currentColor" opacity="0.04" />
          {/* Grid border */}
          <rect x="10" y="10" width="20" height="20" rx="1" stroke="currentColor" strokeWidth="1.2" opacity="0.25" />
          {/* Grid lines */}
          <line x1="14" y1="10" x2="14" y2="30" stroke="currentColor" strokeWidth="0.4" opacity="0.15" />
          <line x1="18" y1="10" x2="18" y2="30" stroke="currentColor" strokeWidth="0.4" opacity="0.15" />
          <line x1="22" y1="10" x2="22" y2="30" stroke="currentColor" strokeWidth="0.4" opacity="0.15" />
          <line x1="26" y1="10" x2="26" y2="30" stroke="currentColor" strokeWidth="0.4" opacity="0.15" />
          <line x1="10" y1="14" x2="30" y2="14" stroke="currentColor" strokeWidth="0.4" opacity="0.15" />
          <line x1="10" y1="18" x2="30" y2="18" stroke="currentColor" strokeWidth="0.4" opacity="0.15" />
          <line x1="10" y1="22" x2="30" y2="22" stroke="currentColor" strokeWidth="0.4" opacity="0.15" />
          <line x1="10" y1="26" x2="30" y2="26" stroke="currentColor" strokeWidth="0.4" opacity="0.15" />
          {/* Row clues */}
          <text x="7" y="13.5" fontSize="3" fill="currentColor" opacity="0.4" fontFamily="system-ui" textAnchor="middle">2 1</text>
          <text x="7" y="17.5" fontSize="3" fill="currentColor" opacity="0.4" fontFamily="system-ui" textAnchor="middle">3</text>
          <text x="7" y="21.5" fontSize="3" fill="currentColor" opacity="0.4" fontFamily="system-ui" textAnchor="middle">1 1</text>
          <text x="7" y="25.5" fontSize="3" fill="currentColor" opacity="0.4" fontFamily="system-ui" textAnchor="middle">4</text>
          <text x="7" y="29.5" fontSize="3" fill="currentColor" opacity="0.4" fontFamily="system-ui" textAnchor="middle">2</text>
          {/* Column clues */}
          <text x="12" y="8" fontSize="3" fill="currentColor" opacity="0.4" fontFamily="system-ui" textAnchor="middle">3</text>
          <text x="16" y="8" fontSize="3" fill="currentColor" opacity="0.4" fontFamily="system-ui" textAnchor="middle">1</text>
          <text x="20" y="8" fontSize="3" fill="currentColor" opacity="0.4" fontFamily="system-ui" textAnchor="middle">4</text>
          <text x="24" y="8" fontSize="3" fill="currentColor" opacity="0.4" fontFamily="system-ui" textAnchor="middle">2</text>
          <text x="28" y="8" fontSize="3" fill="currentColor" opacity="0.4" fontFamily="system-ui" textAnchor="middle">1</text>
          {/* Filled cells */}
          <rect x="10" y="10" width="4" height="4" fill="currentColor" opacity="0.55" />
          <rect x="14" y="10" width="4" height="4" fill="currentColor" opacity="0.55" />
          <rect x="22" y="10" width="4" height="4" fill="currentColor" opacity="0.55" />
          <rect x="10" y="14" width="4" height="4" fill="currentColor" opacity="0.55" />
          <rect x="14" y="14" width="4" height="4" fill="currentColor" opacity="0.55" />
          <rect x="18" y="14" width="4" height="4" fill="currentColor" opacity="0.55" />
          <rect x="18" y="18" width="4" height="4" fill="currentColor" opacity="0.55" />
          <rect x="26" y="18" width="4" height="4" fill="currentColor" opacity="0.55" />
        </svg>
      );

    // Cryptogram: encoded text with underlines
    case "cryptogram":
      return (
        <svg {...props}>
          <rect x="2" y="2" width="28" height="28" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
          {/* Encoded letters - top row */}
          {["X", "K", "Q", "P", "Z"].map((c, i) => (
            <g key={i}>
              <text x={6 + i * 4.8} y="11" fontSize="4.5" fill="currentColor" opacity="0.55" fontFamily="monospace" textAnchor="middle" fontWeight="600">{c}</text>
              <line x1={4 + i * 4.8} y1="12.5" x2={8 + i * 4.8} y2="12.5" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
            </g>
          ))}
          {/* Decoded hints - smaller below */}
          <text x="6" y="16" fontSize="3" fill="currentColor" opacity="0.3" fontFamily="monospace" textAnchor="middle">h</text>
          <text x="15.6" y="16" fontSize="3" fill="currentColor" opacity="0.3" fontFamily="monospace" textAnchor="middle">l</text>
          {/* Second row of encoded */}
          {["M", "B", "R", "W"].map((c, i) => (
            <g key={i}>
              <text x={6 + i * 5.5} y="22" fontSize="4.5" fill="currentColor" opacity="0.55" fontFamily="monospace" textAnchor="middle" fontWeight="600">{c}</text>
              <line x1={4 + i * 5.5} y1="23.5" x2={8 + i * 5.5} y2="23.5" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
            </g>
          ))}
          {/* Arrow hint */}
          <text x="26" y="27" fontSize="3.5" fill="currentColor" opacity="0.2" fontFamily="system-ui">?</text>
        </svg>
      );

    // Word Fill-In: empty slots with one word filled
    case "word-fill":
      return (
        <svg {...props}>
          <rect x="2" y="2" width="28" height="28" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
          {/* Horizontal word slots */}
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={`h${i}`} x={4 + i * 5} y="6" width="4" height="5" rx="0.5" stroke="currentColor" strokeWidth="0.6" opacity="0.2" fill="none" />
          ))}
          {/* Filled word */}
          {["P", "L", "A", "Y"].map((c, i) => (
            <g key={i}>
              <rect x={6.5 + i * 5} y="13" width="4" height="5" rx="0.5" fill="currentColor" opacity="0.08" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.3" />
              <text x={8.5 + i * 5} y="17" fontSize="3.5" fill="currentColor" opacity="0.6" fontFamily="system-ui" textAnchor="middle" fontWeight="600">{c}</text>
            </g>
          ))}
          {/* Another empty row */}
          {[0, 1, 2, 3].map((i) => (
            <rect key={`h2${i}`} x={5 + i * 5} y="21" width="4" height="5" rx="0.5" stroke="currentColor" strokeWidth="0.6" opacity="0.2" fill="none" />
          ))}
        </svg>
      );

    // Number Fill-In: grid with number slots
    case "number-fill":
      return (
        <svg {...props}>
          <rect x="2" y="2" width="28" height="28" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
          {/* Grid lines */}
          {[7.6, 13.2, 18.8, 24.4].map((v) => (
            <line key={`h${v}`} x1="2" y1={v} x2="30" y2={v} stroke="currentColor" strokeWidth="0.5" opacity="0.15" />
          ))}
          {[7.6, 13.2, 18.8, 24.4].map((v) => (
            <line key={`v${v}`} x1={v} y1="2" x2={v} y2="30" stroke="currentColor" strokeWidth="0.5" opacity="0.15" />
          ))}
          {/* Black cells */}
          <rect x="13.2" y="2" width="5.6" height="5.6" fill="currentColor" opacity="0.7" />
          <rect x="2" y="13.2" width="5.6" height="5.6" fill="currentColor" opacity="0.7" />
          <rect x="24.4" y="13.2" width="5.6" height="5.6" fill="currentColor" opacity="0.7" />
          <rect x="13.2" y="24.4" width="5.6" height="5.6" fill="currentColor" opacity="0.7" />
          {/* Numbers in cells */}
          <text x="5" y="7" fontSize="4" fill="currentColor" opacity="0.45" fontFamily="system-ui" textAnchor="middle">4</text>
          <text x="10.5" y="7" fontSize="4" fill="currentColor" opacity="0.45" fontFamily="system-ui" textAnchor="middle">7</text>
          <text x="21.5" y="12.5" fontSize="4" fill="currentColor" opacity="0.45" fontFamily="system-ui" textAnchor="middle">3</text>
          <text x="16" y="18" fontSize="4" fill="currentColor" opacity="0.45" fontFamily="system-ui" textAnchor="middle">1</text>
          <text x="10.5" y="28" fontSize="4" fill="currentColor" opacity="0.45" fontFamily="system-ui" textAnchor="middle">8</text>
        </svg>
      );

    default:
      return null;
  }
};

export default PuzzleIcon;
