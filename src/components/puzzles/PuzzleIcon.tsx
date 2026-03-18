import type { PuzzleCategory } from "@/lib/puzzleTypes";

interface Props {
  type: PuzzleCategory;
  size?: number;
  className?: string;
}

/**
 * Standardised mini puzzle preview icons.
 * All use a 32×32 viewBox with 3px internal padding (content area 3–29).
 * Monochrome via currentColor. Hover contrast handled by parent className.
 */
const PuzzleIcon = ({ type, size = 32, className = "" }: Props) => {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 32 32",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    className: `transition-opacity ${className}`,
    "aria-hidden": true as const,
  };

  // Shared constants for 5×5 grids (crossword, number-fill, word-fill)
  const G5 = { o: 3, cell: 5.2, lines: [8.2, 13.4, 18.6, 23.8] };

  switch (type) {
    // ── Crossword: 5×5 grid, black cells, clue numbers ──
    case "crossword":
      return (
        <svg {...props}>
          <rect x={G5.o} y={G5.o} width="26" height="26" rx="1.5" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
          {G5.lines.map((v) => (
            <line key={`h${v}`} x1={G5.o} y1={v} x2="29" y2={v} stroke="currentColor" strokeWidth="0.6" opacity="0.2" />
          ))}
          {G5.lines.map((v) => (
            <line key={`v${v}`} x1={v} y1={G5.o} x2={v} y2="29" stroke="currentColor" strokeWidth="0.6" opacity="0.2" />
          ))}
          {/* Black cells */}
          <rect x="23.8" y="3" width="5.2" height="5.2" fill="currentColor" opacity="0.82" />
          <rect x="23.8" y="8.2" width="5.2" height="5.2" fill="currentColor" opacity="0.82" />
          <rect x="13.4" y="13.4" width="5.2" height="5.2" fill="currentColor" opacity="0.82" />
          <rect x="3" y="18.6" width="5.2" height="5.2" fill="currentColor" opacity="0.82" />
          <rect x="3" y="23.8" width="5.2" height="5.2" fill="currentColor" opacity="0.82" />
          {/* Clue numbers */}
          <text x="4" y="6.2" fontSize="3" fill="currentColor" opacity="0.6" fontFamily="system-ui" fontWeight="500">1</text>
          <text x="9.2" y="6.2" fontSize="3" fill="currentColor" opacity="0.6" fontFamily="system-ui" fontWeight="500">2</text>
          <text x="14.4" y="6.2" fontSize="3" fill="currentColor" opacity="0.6" fontFamily="system-ui" fontWeight="500">3</text>
          <text x="19.6" y="6.2" fontSize="3" fill="currentColor" opacity="0.6" fontFamily="system-ui" fontWeight="500">4</text>
        </svg>
      );

    // ── Sudoku: 9×9 with 3×3 blocks and sparse digits ──
    case "sudoku": {
      const S = { o: 3, blk: 8.67, cell: 2.89 };
      const blkLines = [S.o + S.blk, S.o + S.blk * 2];
      const cellOffsets = [1, 2, 4, 5, 7, 8].map((i) => S.o + i * S.cell);
      return (
        <svg {...props}>
          <rect x={S.o} y={S.o} width="26" height="26" rx="1.5" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
          {/* Block dividers */}
          {blkLines.map((v) => (
            <g key={v}>
              <line x1={S.o} y1={v} x2="29" y2={v} stroke="currentColor" strokeWidth="1" opacity="0.4" />
              <line x1={v} y1={S.o} x2={v} y2="29" stroke="currentColor" strokeWidth="1" opacity="0.4" />
            </g>
          ))}
          {/* Cell lines */}
          {cellOffsets.map((v) => (
            <g key={v}>
              <line x1={S.o} y1={v} x2="29" y2={v} stroke="currentColor" strokeWidth="0.35" opacity="0.15" />
              <line x1={v} y1={S.o} x2={v} y2="29" stroke="currentColor" strokeWidth="0.35" opacity="0.15" />
            </g>
          ))}
          {/* Digits — placed at cell centres */}
          <text x="5.95" y="8.8" fontSize="4" fill="currentColor" opacity="0.7" fontFamily="system-ui" textAnchor="middle" fontWeight="600">5</text>
          <text x="14.6" y="8.8" fontSize="4" fill="currentColor" opacity="0.7" fontFamily="system-ui" textAnchor="middle" fontWeight="600">8</text>
          <text x="23.3" y="8.8" fontSize="4" fill="currentColor" opacity="0.7" fontFamily="system-ui" textAnchor="middle" fontWeight="600">2</text>
          <text x="8.85" y="17.5" fontSize="4" fill="currentColor" opacity="0.7" fontFamily="system-ui" textAnchor="middle" fontWeight="600">3</text>
          <text x="20.4" y="17.5" fontSize="4" fill="currentColor" opacity="0.7" fontFamily="system-ui" textAnchor="middle" fontWeight="600">6</text>
          <text x="5.95" y="26.2" fontSize="4" fill="currentColor" opacity="0.7" fontFamily="system-ui" textAnchor="middle" fontWeight="600">1</text>
          <text x="17.5" y="26.2" fontSize="4" fill="currentColor" opacity="0.7" fontFamily="system-ui" textAnchor="middle" fontWeight="600">7</text>
        </svg>
      );
    }

    // ── Word Search: 5×4 letter grid with highlighted diagonal ──
    case "word-search": {
      const letters: [string, number, number, boolean][] = [
        ["F", 6, 8.5, true], ["R", 11, 8.5, false], ["T", 16, 8.5, false], ["X", 21, 8.5, false], ["M", 26, 8.5, false],
        ["K", 6, 13.5, false], ["I", 11, 13.5, true], ["N", 16, 13.5, false], ["D", 21, 13.5, false], ["E", 26, 13.5, false],
        ["P", 6, 18.5, false], ["L", 11, 18.5, false], ["A", 16, 18.5, true], ["Y", 21, 18.5, false], ["S", 26, 18.5, false],
        ["G", 6, 23.5, false], ["O", 11, 23.5, false], ["B", 16, 23.5, false], ["N", 21, 23.5, true], ["Z", 26, 23.5, false],
      ];
      return (
        <svg {...props}>
          <rect x="3" y="3" width="26" height="26" rx="1.5" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
          {/* Highlight band */}
          <line x1="6" y1="8.5" x2="21" y2="23.5" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" opacity="0.1" />
          {letters.map(([c, x, y, hl], i) => (
            <text key={i} x={x} y={y} fontSize="3.8" fill="currentColor"
              opacity={hl ? 0.75 : 0.3}
              fontFamily="system-ui" textAnchor="middle" dominantBaseline="central"
              fontWeight={hl ? 700 : 400}>
              {c}
            </text>
          ))}
        </svg>
      );
    }

    // ── Kakuro: 3×3 grid with diagonal clue cells ──
    case "kakuro": {
      const K = { o: 3, cell: 8.67 };
      const kLines = [K.o + K.cell, K.o + K.cell * 2];
      return (
        <svg {...props}>
          <rect x={K.o} y={K.o} width="26" height="26" rx="1.5" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
          {/* Grid lines */}
          {kLines.map((v) => (
            <g key={v}>
              <line x1={K.o} y1={v} x2="29" y2={v} stroke="currentColor" strokeWidth="0.7" opacity="0.25" />
              <line x1={v} y1={K.o} x2={v} y2="29" stroke="currentColor" strokeWidth="0.7" opacity="0.25" />
            </g>
          ))}
          {/* Clue cells — filled + diagonal */}
          <rect x="3" y="3" width="8.67" height="8.67" fill="currentColor" opacity="0.1" />
          <line x1="3" y1="3" x2="11.67" y2="11.67" stroke="currentColor" strokeWidth="0.7" opacity="0.4" />
          <rect x="3" y="11.67" width="8.67" height="8.67" fill="currentColor" opacity="0.1" />
          <line x1="3" y1="11.67" x2="11.67" y2="20.33" stroke="currentColor" strokeWidth="0.7" opacity="0.4" />
          <rect x="3" y="20.33" width="8.67" height="8.67" fill="currentColor" opacity="0.1" />
          <line x1="3" y1="20.33" x2="11.67" y2="29" stroke="currentColor" strokeWidth="0.7" opacity="0.4" />
          {/* Clue numbers */}
          <text x="9" y="7" fontSize="3.2" fill="currentColor" opacity="0.6" fontFamily="system-ui" textAnchor="middle" fontWeight="500">16</text>
          <text x="5.5" y="10.2" fontSize="3.2" fill="currentColor" opacity="0.6" fontFamily="system-ui" textAnchor="middle" fontWeight="500">9</text>
          <text x="9" y="15.7" fontSize="3.2" fill="currentColor" opacity="0.6" fontFamily="system-ui" textAnchor="middle" fontWeight="500">7</text>
          <text x="5.5" y="18.9" fontSize="3.2" fill="currentColor" opacity="0.6" fontFamily="system-ui" textAnchor="middle" fontWeight="500">3</text>
          {/* Answer digits */}
          <text x="16" y="8.5" fontSize="4" fill="currentColor" opacity="0.65" fontFamily="system-ui" textAnchor="middle" fontWeight="600">9</text>
          <text x="24.7" y="17.2" fontSize="4" fill="currentColor" opacity="0.65" fontFamily="system-ui" textAnchor="middle" fontWeight="600">2</text>
          <text x="16" y="26" fontSize="4" fill="currentColor" opacity="0.65" fontFamily="system-ui" textAnchor="middle" fontWeight="600">4</text>
        </svg>
      );
    }

    // ── Nonogram: offset grid with clue margins ──
    case "nonogram": {
      const N = { cw: 7, gh: 20, go: 10 }; // clue width, grid size, grid origin
      const nCellSize = N.gh / 5;
      const nLines = Array.from({ length: 4 }, (_, i) => N.go + (i + 1) * nCellSize);
      return (
        <svg {...props}>
          {/* Clue backgrounds */}
          <rect x={N.go} y="3" width={N.gh} height={N.cw - 1} rx="1" fill="currentColor" opacity="0.05" />
          <rect x="3" y={N.go} width={N.cw - 1} height={N.gh} rx="1" fill="currentColor" opacity="0.05" />
          {/* Grid border */}
          <rect x={N.go} y={N.go} width={N.gh} height={N.gh} rx="1" stroke="currentColor" strokeWidth="1.2" opacity="0.35" />
          {/* Grid lines */}
          {nLines.map((v) => (
            <g key={v}>
              <line x1={N.go} y1={v} x2={N.go + N.gh} y2={v} stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
              <line x1={v} y1={N.go} x2={v} y2={N.go + N.gh} stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
            </g>
          ))}
          {/* Row clues */}
          {["2 1", "3", "1 1", "4", "2"].map((clue, i) => (
            <text key={`r${i}`} x="7" y={N.go + i * nCellSize + nCellSize / 2 + 1} fontSize="2.8" fill="currentColor" opacity="0.55" fontFamily="system-ui" textAnchor="middle" fontWeight="500">{clue}</text>
          ))}
          {/* Col clues */}
          {["3", "1", "4", "2", "1"].map((clue, i) => (
            <text key={`c${i}`} x={N.go + i * nCellSize + nCellSize / 2} y="8.5" fontSize="2.8" fill="currentColor" opacity="0.55" fontFamily="system-ui" textAnchor="middle" fontWeight="500">{clue}</text>
          ))}
          {/* Filled cells */}
          {[
            [0, 0], [1, 0], [3, 0],
            [0, 1], [1, 1], [2, 1],
            [2, 2], [4, 2],
            [0, 3], [1, 3], [2, 3], [3, 3],
            [1, 4], [2, 4],
          ].map(([c, r]) => (
            <rect key={`f${c}${r}`} x={N.go + c * nCellSize + 0.3} y={N.go + r * nCellSize + 0.3} width={nCellSize - 0.6} height={nCellSize - 0.6} rx="0.3" fill="currentColor" opacity="0.65" />
          ))}
        </svg>
      );
    }

    // ── Cryptogram: cipher text with underlines + decoded hints ──
    case "cryptogram": {
      const spacing = 4.4;
      const row1 = ["X", "K", "Q", "P", "Z"];
      const row2 = ["M", "B", "R", "W", "J"];
      const xStart = 5.5;
      return (
        <svg {...props}>
          <rect x="3" y="3" width="26" height="26" rx="1.5" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
          {/* Row 1 — encoded */}
          {row1.map((c, i) => (
            <g key={`r1${i}`}>
              <text x={xStart + i * spacing} y="11.5" fontSize="4.2" fill="currentColor" opacity="0.7" fontFamily="monospace" textAnchor="middle" fontWeight="600">{c}</text>
              <line x1={xStart + i * spacing - 2} y1="13" x2={xStart + i * spacing + 2} y2="13" stroke="currentColor" strokeWidth="0.7" opacity="0.35" />
            </g>
          ))}
          {/* Decoded hints under row 1 */}
          <text x={xStart} y="16.5" fontSize="2.8" fill="currentColor" opacity="0.4" fontFamily="monospace" textAnchor="middle">h</text>
          <text x={xStart + 2 * spacing} y="16.5" fontSize="2.8" fill="currentColor" opacity="0.4" fontFamily="monospace" textAnchor="middle">l</text>
          {/* Row 2 — encoded */}
          {row2.map((c, i) => (
            <g key={`r2${i}`}>
              <text x={xStart + i * spacing} y="22.5" fontSize="4.2" fill="currentColor" opacity="0.7" fontFamily="monospace" textAnchor="middle" fontWeight="600">{c}</text>
              <line x1={xStart + i * spacing - 2} y1="24" x2={xStart + i * spacing + 2} y2="24" stroke="currentColor" strokeWidth="0.7" opacity="0.35" />
            </g>
          ))}
          {/* Subtle ? */}
          <text x={xStart + 4 * spacing} y="27.5" fontSize="3" fill="currentColor" opacity="0.25" fontFamily="system-ui" textAnchor="middle">?</text>
        </svg>
      );
    }

    // ── Word Fill-In: 5×5 grid with black cells + filled word ──
    case "word-fill":
      return (
        <svg {...props}>
          <rect x={G5.o} y={G5.o} width="26" height="26" rx="1.5" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
          {G5.lines.map((v) => (
            <line key={`h${v}`} x1={G5.o} y1={v} x2="29" y2={v} stroke="currentColor" strokeWidth="0.6" opacity="0.2" />
          ))}
          {G5.lines.map((v) => (
            <line key={`v${v}`} x1={v} y1={G5.o} x2={v} y2="29" stroke="currentColor" strokeWidth="0.6" opacity="0.2" />
          ))}
          {/* Black cells */}
          <rect x="23.8" y="3" width="5.2" height="5.2" fill="currentColor" opacity="0.82" />
          <rect x="23.8" y="8.2" width="5.2" height="5.2" fill="currentColor" opacity="0.82" />
          <rect x="13.4" y="13.4" width="5.2" height="5.2" fill="currentColor" opacity="0.82" />
          <rect x="3" y="18.6" width="5.2" height="5.2" fill="currentColor" opacity="0.82" />
          <rect x="3" y="23.8" width="5.2" height="5.2" fill="currentColor" opacity="0.82" />
          {/* Filled word across row 2 */}
          {["O", "P", "E", "N"].map((c, i) => (
            <text key={c + i} x={G5.o + i * 5.2 + 2.6} y="12.2" fontSize="3.6" fill="currentColor" opacity="0.7" fontFamily="system-ui" textAnchor="middle" fontWeight="600">{c}</text>
          ))}
          {/* One vertical letter */}
          <text x={G5.o + 2.6} y="7" fontSize="3.6" fill="currentColor" opacity="0.45" fontFamily="system-ui" textAnchor="middle">C</text>
        </svg>
      );

    // ── Number Fill-In: 5×5 grid with black cells + numbers ──
    case "number-fill":
      return (
        <svg {...props}>
          <rect x={G5.o} y={G5.o} width="26" height="26" rx="1.5" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
          {G5.lines.map((v) => (
            <line key={`h${v}`} x1={G5.o} y1={v} x2="29" y2={v} stroke="currentColor" strokeWidth="0.6" opacity="0.2" />
          ))}
          {G5.lines.map((v) => (
            <line key={`v${v}`} x1={v} y1={G5.o} x2={v} y2="29" stroke="currentColor" strokeWidth="0.6" opacity="0.2" />
          ))}
          {/* Black cells — symmetric */}
          <rect x="13.4" y="3" width="5.2" height="5.2" fill="currentColor" opacity="0.82" />
          <rect x="3" y="13.4" width="5.2" height="5.2" fill="currentColor" opacity="0.82" />
          <rect x="23.8" y="13.4" width="5.2" height="5.2" fill="currentColor" opacity="0.82" />
          <rect x="13.4" y="23.8" width="5.2" height="5.2" fill="currentColor" opacity="0.82" />
          {/* Digits */}
          <text x={G5.o + 2.6} y="7" fontSize="3.6" fill="currentColor" opacity="0.65" fontFamily="system-ui" textAnchor="middle" fontWeight="600">4</text>
          <text x={G5.o + 5.2 + 2.6} y="7" fontSize="3.6" fill="currentColor" opacity="0.65" fontFamily="system-ui" textAnchor="middle" fontWeight="600">7</text>
          <text x={G5.o + 2 * 5.2 + 2.6} y="17.4" fontSize="3.6" fill="currentColor" opacity="0.65" fontFamily="system-ui" textAnchor="middle" fontWeight="600">1</text>
          <text x={G5.o + 3 * 5.2 + 2.6} y="12.2" fontSize="3.6" fill="currentColor" opacity="0.65" fontFamily="system-ui" textAnchor="middle" fontWeight="600">3</text>
          <text x={G5.o + 5.2 + 2.6} y="27.6" fontSize="3.6" fill="currentColor" opacity="0.65" fontFamily="system-ui" textAnchor="middle" fontWeight="600">8</text>
        </svg>
      );

    default:
      return null;
  }
};

export default PuzzleIcon;
