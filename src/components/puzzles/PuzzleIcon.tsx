import type { PuzzleCategory } from "@/lib/puzzleTypes";

interface Props {
  type: PuzzleCategory;
  size?: number;
  className?: string;
}

const HL = "hsl(var(--primary))";
const HL_BG = "hsl(var(--primary) / 0.15)";

/**
 * Standardised mini puzzle preview icons.
 * All use a 32×32 viewBox with 3px internal padding (content area 3–29).
 * Monochrome via currentColor + subtle primary accent on one key element.
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
    // ── Crossword: 5×5 grid, highlight one completed word across row 2 ──
    case "crossword":
      return (
        <svg {...props}>
          <rect x={G5.o} y={G5.o} width="26" height="26" rx="1.5" stroke="currentColor" strokeWidth="1.6" opacity="0.45" />
          {G5.lines.map((v) => (
            <line key={`h${v}`} x1={G5.o} y1={v} x2="29" y2={v} stroke="currentColor" strokeWidth="0.7" opacity="0.28" />
          ))}
          {G5.lines.map((v) => (
            <line key={`v${v}`} x1={v} y1={G5.o} x2={v} y2="29" stroke="currentColor" strokeWidth="0.7" opacity="0.28" />
          ))}
          {/* Black cells */}
          <rect x="23.8" y="3" width="5.2" height="5.2" fill="currentColor" opacity="0.88" />
          <rect x="23.8" y="8.2" width="5.2" height="5.2" fill="currentColor" opacity="0.88" />
          <rect x="13.4" y="13.4" width="5.2" height="5.2" fill="currentColor" opacity="0.88" />
          <rect x="3" y="18.6" width="5.2" height="5.2" fill="currentColor" opacity="0.88" />
          <rect x="3" y="23.8" width="5.2" height="5.2" fill="currentColor" opacity="0.88" />
          {/* Clue numbers */}
          <text x="4" y="6.2" fontSize="3" fill="currentColor" opacity="0.6" fontFamily="system-ui" fontWeight="500">1</text>
          <text x="9.2" y="6.2" fontSize="3" fill="currentColor" opacity="0.6" fontFamily="system-ui" fontWeight="500">2</text>
          <text x="14.4" y="6.2" fontSize="3" fill="currentColor" opacity="0.6" fontFamily="system-ui" fontWeight="500">3</text>
          <text x="19.6" y="6.2" fontSize="3" fill="currentColor" opacity="0.6" fontFamily="system-ui" fontWeight="500">4</text>
          {/* ★ Accent: highlight completed word "OPEN" across row 2 (cols 0–3) */}
          <rect x={G5.o} y="8.2" width={4 * 5.2} height="5.2" rx="1" fill={HL_BG} />
          {["O", "P", "E", "N"].map((c, i) => (
            <text key={i} x={G5.o + i * 5.2 + 2.6} y="12.2" fontSize="3.6" fill={HL} opacity="0.9" fontFamily="system-ui" textAnchor="middle" fontWeight="700">{c}</text>
          ))}
        </svg>
      );

    // ── Sudoku: 9×9 with 3×3 blocks, highlight one newly filled number ──
    case "sudoku": {
      const S = { o: 3, blk: 8.67, cell: 2.89 };
      const blkLines = [S.o + S.blk, S.o + S.blk * 2];
      const cellOffsets = [1, 2, 4, 5, 7, 8].map((i) => S.o + i * S.cell);
      return (
        <svg {...props}>
          <rect x={S.o} y={S.o} width="26" height="26" rx="1.5" stroke="currentColor" strokeWidth="1.6" opacity="0.45" />
          {/* Block dividers */}
          {blkLines.map((v) => (
            <g key={v}>
              <line x1={S.o} y1={v} x2="29" y2={v} stroke="currentColor" strokeWidth="1.1" opacity="0.5" />
              <line x1={v} y1={S.o} x2={v} y2="29" stroke="currentColor" strokeWidth="1.1" opacity="0.5" />
            </g>
          ))}
          {/* Cell lines */}
          {cellOffsets.map((v) => (
            <g key={v}>
              <line x1={S.o} y1={v} x2="29" y2={v} stroke="currentColor" strokeWidth="0.4" opacity="0.2" />
              <line x1={v} y1={S.o} x2={v} y2="29" stroke="currentColor" strokeWidth="0.4" opacity="0.2" />
            </g>
          ))}
          {/* Existing digits */}
          <text x="5.95" y="8.8" fontSize="4" fill="currentColor" opacity="0.75" fontFamily="system-ui" textAnchor="middle" fontWeight="600">5</text>
          <text x="14.6" y="8.8" fontSize="4" fill="currentColor" opacity="0.75" fontFamily="system-ui" textAnchor="middle" fontWeight="600">8</text>
          <text x="23.3" y="8.8" fontSize="4" fill="currentColor" opacity="0.75" fontFamily="system-ui" textAnchor="middle" fontWeight="600">2</text>
          <text x="8.85" y="17.5" fontSize="4" fill="currentColor" opacity="0.75" fontFamily="system-ui" textAnchor="middle" fontWeight="600">3</text>
          <text x="20.4" y="17.5" fontSize="4" fill="currentColor" opacity="0.75" fontFamily="system-ui" textAnchor="middle" fontWeight="600">6</text>
          <text x="5.95" y="26.2" fontSize="4" fill="currentColor" opacity="0.75" fontFamily="system-ui" textAnchor="middle" fontWeight="600">1</text>
          <text x="17.5" y="26.2" fontSize="4" fill="currentColor" opacity="0.75" fontFamily="system-ui" textAnchor="middle" fontWeight="600">7</text>
          {/* ★ Accent: newly filled "4" in center cell */}
          <rect x={S.o + S.cell * 4} y={S.o + S.cell * 4} width={S.cell} height={S.cell} rx="0.5" fill={HL_BG} />
          <text x="14.6" y="17.5" fontSize="4" fill={HL} opacity="0.95" fontFamily="system-ui" textAnchor="middle" fontWeight="700">4</text>
        </svg>
      );
    }

    // ── Word Search: 5×4 letter grid with highlighted found word ──
    case "word-search": {
      const letters: [string, number, number, boolean][] = [
        ["F", 6, 8.5, true], ["R", 11, 8.5, false], ["T", 16, 8.5, false], ["X", 21, 8.5, false], ["M", 26, 8.5, false],
        ["K", 6, 13.5, false], ["I", 11, 13.5, true], ["N", 16, 13.5, false], ["D", 21, 13.5, false], ["E", 26, 13.5, false],
        ["P", 6, 18.5, false], ["L", 11, 18.5, false], ["A", 16, 18.5, true], ["Y", 21, 18.5, false], ["S", 26, 18.5, false],
        ["G", 6, 23.5, false], ["O", 11, 23.5, false], ["B", 16, 23.5, false], ["N", 21, 23.5, true], ["Z", 26, 23.5, false],
      ];
      return (
        <svg {...props}>
          <rect x="3" y="3" width="26" height="26" rx="1.5" stroke="currentColor" strokeWidth="1.6" opacity="0.45" />
          {/* ★ Accent: highlight band for diagonal word "FIAN" */}
          <line x1="6" y1="8.5" x2="21" y2="23.5" stroke={HL} strokeWidth="4.5" strokeLinecap="round" opacity="0.18" />
          {letters.map(([c, x, y, hl], i) => (
            <text key={i} x={x} y={y} fontSize="3.8" fill={hl ? HL : "currentColor"}
              opacity={hl ? 0.9 : 0.35}
              fontFamily="system-ui" textAnchor="middle" dominantBaseline="central"
              fontWeight={hl ? 700 : 400}>
              {c}
            </text>
          ))}
        </svg>
      );
    }

    // ── Kakuro: 3×3 grid with highlighted correct sum row ──
    case "kakuro": {
      const K = { o: 3, cell: 8.67 };
      const kLines = [K.o + K.cell, K.o + K.cell * 2];
      return (
        <svg {...props}>
          <rect x={K.o} y={K.o} width="26" height="26" rx="1.5" stroke="currentColor" strokeWidth="1.6" opacity="0.45" />
          {/* Grid lines */}
          {kLines.map((v) => (
            <g key={v}>
              <line x1={K.o} y1={v} x2="29" y2={v} stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
              <line x1={v} y1={K.o} x2={v} y2="29" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
            </g>
          ))}
          {/* Clue cells */}
          <rect x="3" y="3" width="8.67" height="8.67" fill="currentColor" opacity="0.12" />
          <line x1="3" y1="3" x2="11.67" y2="11.67" stroke="currentColor" strokeWidth="0.7" opacity="0.45" />
          <rect x="3" y="11.67" width="8.67" height="8.67" fill="currentColor" opacity="0.12" />
          <line x1="3" y1="11.67" x2="11.67" y2="20.33" stroke="currentColor" strokeWidth="0.7" opacity="0.45" />
          <rect x="3" y="20.33" width="8.67" height="8.67" fill="currentColor" opacity="0.12" />
          <line x1="3" y1="20.33" x2="11.67" y2="29" stroke="currentColor" strokeWidth="0.7" opacity="0.45" />
          {/* Clue numbers */}
          <text x="9" y="7" fontSize="3.2" fill="currentColor" opacity="0.65" fontFamily="system-ui" textAnchor="middle" fontWeight="500">16</text>
          <text x="5.5" y="10.2" fontSize="3.2" fill="currentColor" opacity="0.65" fontFamily="system-ui" textAnchor="middle" fontWeight="500">9</text>
          <text x="9" y="15.7" fontSize="3.2" fill="currentColor" opacity="0.65" fontFamily="system-ui" textAnchor="middle" fontWeight="500">7</text>
          <text x="5.5" y="18.9" fontSize="3.2" fill="currentColor" opacity="0.65" fontFamily="system-ui" textAnchor="middle" fontWeight="500">3</text>
          {/* ★ Accent: highlight first row's answer cells (sum=16 → 9+7) */}
          <rect x="11.67" y="3" width={2 * 8.67} height="8.67" rx="1" fill={HL_BG} />
          <text x="16" y="8.5" fontSize="4" fill={HL} opacity="0.95" fontFamily="system-ui" textAnchor="middle" fontWeight="700">9</text>
          <text x="24.7" y="8.5" fontSize="4" fill={HL} opacity="0.95" fontFamily="system-ui" textAnchor="middle" fontWeight="700">7</text>
          {/* Non-highlighted digits */}
          <text x="16" y="17.2" fontSize="4" fill="currentColor" opacity="0.65" fontFamily="system-ui" textAnchor="middle" fontWeight="600">4</text>
          <text x="24.7" y="17.2" fontSize="4" fill="currentColor" opacity="0.65" fontFamily="system-ui" textAnchor="middle" fontWeight="600">3</text>
          <text x="16" y="26" fontSize="4" fill="currentColor" opacity="0.65" fontFamily="system-ui" textAnchor="middle" fontWeight="600">2</text>
          <text x="24.7" y="26" fontSize="4" fill="currentColor" opacity="0.65" fontFamily="system-ui" textAnchor="middle" fontWeight="600">1</text>
        </svg>
      );
    }

    // ── Nonogram: offset grid with highlighted completed row ──
    case "nonogram": {
      const N = { cw: 7, gh: 20, go: 10 };
      const nCellSize = N.gh / 5;
      const nLines = Array.from({ length: 4 }, (_, i) => N.go + (i + 1) * nCellSize);
      // Row 3 has clue "4" → 4 filled cells (cols 0,1,2,3)
      const highlightRow = 3;
      const highlightCols = new Set([0, 1, 2, 3]);
      return (
        <svg {...props}>
          {/* Clue backgrounds */}
          <rect x={N.go} y="3" width={N.gh} height={N.cw - 1} rx="1" fill="currentColor" opacity="0.06" />
          <rect x="3" y={N.go} width={N.cw - 1} height={N.gh} rx="1" fill="currentColor" opacity="0.06" />
          {/* Grid border */}
          <rect x={N.go} y={N.go} width={N.gh} height={N.gh} rx="1" stroke="currentColor" strokeWidth="1.3" opacity="0.45" />
          {/* Grid lines */}
          {nLines.map((v) => (
            <g key={v}>
              <line x1={N.go} y1={v} x2={N.go + N.gh} y2={v} stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
              <line x1={v} y1={N.go} x2={v} y2={N.go + N.gh} stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
            </g>
          ))}
          {/* Row clues */}
          {["2 1", "3", "1 1", "4", "2"].map((clue, i) => (
            <text key={`r${i}`} x="7" y={N.go + i * nCellSize + nCellSize / 2 + 1} fontSize="2.8" fill={i === highlightRow ? HL : "currentColor"} opacity={i === highlightRow ? 0.9 : 0.55} fontFamily="system-ui" textAnchor="middle" fontWeight={i === highlightRow ? "700" : "500"}>{clue}</text>
          ))}
          {/* Col clues */}
          {["3", "1", "4", "2", "1"].map((clue, i) => (
            <text key={`c${i}`} x={N.go + i * nCellSize + nCellSize / 2} y="8.5" fontSize="2.8" fill="currentColor" opacity="0.55" fontFamily="system-ui" textAnchor="middle" fontWeight="500">{clue}</text>
          ))}
          {/* ★ Accent: highlight row 3 background */}
          <rect x={N.go} y={N.go + highlightRow * nCellSize} width={N.gh} height={nCellSize} rx="0.5" fill={HL_BG} />
          {/* Filled cells */}
          {[
            [0, 0], [1, 0], [3, 0],
            [0, 1], [1, 1], [2, 1],
            [2, 2], [4, 2],
            [0, 3], [1, 3], [2, 3], [3, 3],
            [1, 4], [2, 4],
          ].map(([c, r]) => {
            const isHL = r === highlightRow && highlightCols.has(c);
            return (
              <rect key={`f${c}${r}`} x={N.go + c * nCellSize + 0.3} y={N.go + r * nCellSize + 0.3} width={nCellSize - 0.6} height={nCellSize - 0.6} rx="0.3" fill={isHL ? HL : "currentColor"} opacity={isHL ? 0.7 : 0.7} />
            );
          })}
        </svg>
      );
    }

    // ── Cryptogram: cipher text with highlighted decoded letters ──
    case "cryptogram": {
      const spacing = 4.4;
      const row1 = ["X", "K", "Q", "P", "Z"];
      const row2 = ["M", "B", "R", "W", "J"];
      const xStart = 5.5;
      // Decoded hints: indices 0 and 2 in row1, index 1 in row2
      const decodedR1: Record<number, string> = { 0: "h", 2: "l" };
      const decodedR2: Record<number, string> = { 1: "e" };
      return (
        <svg {...props}>
          <rect x="3" y="3" width="26" height="26" rx="1.5" stroke="currentColor" strokeWidth="1.6" opacity="0.45" />
          {/* Row 1 — encoded */}
          {row1.map((c, i) => {
            const isDec = i in decodedR1;
            return (
              <g key={`r1${i}`}>
                {/* ★ Accent bg on decoded letters */}
                {isDec && <rect x={xStart + i * spacing - 2.2} y="7" width="4.4" height="6.5" rx="1" fill={HL_BG} />}
                <text x={xStart + i * spacing} y="11.5" fontSize="4.2" fill={isDec ? HL : "currentColor"} opacity={isDec ? 0.95 : 0.75} fontFamily="monospace" textAnchor="middle" fontWeight={isDec ? 700 : 600}>{c}</text>
                <line x1={xStart + i * spacing - 2} y1="13" x2={xStart + i * spacing + 2} y2="13" stroke={isDec ? HL : "currentColor"} strokeWidth="0.7" opacity={isDec ? 0.6 : 0.35} />
              </g>
            );
          })}
          {/* Decoded hints under row 1 */}
          {Object.entries(decodedR1).map(([idx, ch]) => (
            <text key={`d1${idx}`} x={xStart + Number(idx) * spacing} y="16.5" fontSize="2.8" fill={HL} opacity="0.8" fontFamily="monospace" textAnchor="middle" fontWeight="600">{ch}</text>
          ))}
          {/* Row 2 — encoded */}
          {row2.map((c, i) => {
            const isDec = i in decodedR2;
            return (
              <g key={`r2${i}`}>
                {isDec && <rect x={xStart + i * spacing - 2.2} y="18" width="4.4" height="6.5" rx="1" fill={HL_BG} />}
                <text x={xStart + i * spacing} y="22.5" fontSize="4.2" fill={isDec ? HL : "currentColor"} opacity={isDec ? 0.95 : 0.75} fontFamily="monospace" textAnchor="middle" fontWeight={isDec ? 700 : 600}>{c}</text>
                <line x1={xStart + i * spacing - 2} y1="24" x2={xStart + i * spacing + 2} y2="24" stroke={isDec ? HL : "currentColor"} strokeWidth="0.7" opacity={isDec ? 0.6 : 0.35} />
              </g>
            );
          })}
          {/* Decoded hints under row 2 */}
          {Object.entries(decodedR2).map(([idx, ch]) => (
            <text key={`d2${idx}`} x={xStart + Number(idx) * spacing} y="27.5" fontSize="2.8" fill={HL} opacity="0.8" fontFamily="monospace" textAnchor="middle" fontWeight="600">{ch}</text>
          ))}
        </svg>
      );
    }

    // ── Word Fill-In: 5×5 grid, highlight one correctly placed word ──
    case "word-fill":
      return (
        <svg {...props}>
          <rect x={G5.o} y={G5.o} width="26" height="26" rx="1.5" stroke="currentColor" strokeWidth="1.6" opacity="0.45" />
          {G5.lines.map((v) => (
            <line key={`h${v}`} x1={G5.o} y1={v} x2="29" y2={v} stroke="currentColor" strokeWidth="0.7" opacity="0.28" />
          ))}
          {G5.lines.map((v) => (
            <line key={`v${v}`} x1={v} y1={G5.o} x2={v} y2="29" stroke="currentColor" strokeWidth="0.7" opacity="0.28" />
          ))}
          {/* Black cells */}
          <rect x="23.8" y="3" width="5.2" height="5.2" fill="currentColor" opacity="0.88" />
          <rect x="23.8" y="8.2" width="5.2" height="5.2" fill="currentColor" opacity="0.88" />
          <rect x="13.4" y="13.4" width="5.2" height="5.2" fill="currentColor" opacity="0.88" />
          <rect x="3" y="18.6" width="5.2" height="5.2" fill="currentColor" opacity="0.88" />
          <rect x="3" y="23.8" width="5.2" height="5.2" fill="currentColor" opacity="0.88" />
          {/* ★ Accent: highlight placed word "OPEN" across row 2 (cols 0–3) */}
          <rect x={G5.o} y="8.2" width={4 * 5.2} height="5.2" rx="1" fill={HL_BG} />
          {["O", "P", "E", "N"].map((c, i) => (
            <text key={i} x={G5.o + i * 5.2 + 2.6} y="12.2" fontSize="3.6" fill={HL} opacity="0.9" fontFamily="system-ui" textAnchor="middle" fontWeight="700">{c}</text>
          ))}
          {/* Neutral vertical letter */}
          <text x={G5.o + 2.6} y="7" fontSize="3.6" fill="currentColor" opacity="0.5" fontFamily="system-ui" textAnchor="middle">C</text>
        </svg>
      );

    // ── Number Fill-In: 5×5 grid, highlight one completed number section ──
    case "number-fill":
      return (
        <svg {...props}>
          <rect x={G5.o} y={G5.o} width="26" height="26" rx="1.5" stroke="currentColor" strokeWidth="1.6" opacity="0.45" />
          {G5.lines.map((v) => (
            <line key={`h${v}`} x1={G5.o} y1={v} x2="29" y2={v} stroke="currentColor" strokeWidth="0.7" opacity="0.28" />
          ))}
          {G5.lines.map((v) => (
            <line key={`v${v}`} x1={v} y1={G5.o} x2={v} y2="29" stroke="currentColor" strokeWidth="0.7" opacity="0.28" />
          ))}
          {/* Black cells — symmetric */}
          <rect x="13.4" y="3" width="5.2" height="5.2" fill="currentColor" opacity="0.88" />
          <rect x="3" y="13.4" width="5.2" height="5.2" fill="currentColor" opacity="0.88" />
          <rect x="23.8" y="13.4" width="5.2" height="5.2" fill="currentColor" opacity="0.88" />
          <rect x="13.4" y="23.8" width="5.2" height="5.2" fill="currentColor" opacity="0.88" />
          {/* ★ Accent: highlight "47" across row 1 cols 0–1 (2-digit number before black at col 2) */}
          <rect x={G5.o} y="3" width={2 * 5.2} height="5.2" rx="1" fill={HL_BG} />
          <text x={G5.o + 2.6} y="7" fontSize="3.6" fill={HL} opacity="0.95" fontFamily="system-ui" textAnchor="middle" fontWeight="700">4</text>
          <text x={G5.o + 5.2 + 2.6} y="7" fontSize="3.6" fill={HL} opacity="0.95" fontFamily="system-ui" textAnchor="middle" fontWeight="700">7</text>
          {/* Neutral digits */}
          <text x={G5.o + 2 * 5.2 + 2.6} y="17.4" fontSize="3.6" fill="currentColor" opacity="0.7" fontFamily="system-ui" textAnchor="middle" fontWeight="600">1</text>
          <text x={G5.o + 3 * 5.2 + 2.6} y="12.2" fontSize="3.6" fill="currentColor" opacity="0.7" fontFamily="system-ui" textAnchor="middle" fontWeight="600">3</text>
          <text x={G5.o + 5.2 + 2.6} y="27.6" fontSize="3.6" fill="currentColor" opacity="0.7" fontFamily="system-ui" textAnchor="middle" fontWeight="600">8</text>
        </svg>
      );

    default:
      return null;
  }
};

export default PuzzleIcon;
