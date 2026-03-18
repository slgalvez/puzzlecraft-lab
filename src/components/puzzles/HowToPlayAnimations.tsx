import type { PuzzleCategory } from "@/lib/puzzleTypes";

/* ─── shared constants ─── */
const S = 160;          // viewBox size
const G = 5;            // grid cells per side (conceptual)
const CS = 22;          // cell size
const PAD = 14;         // grid offset
const DUR = "2.8s";

const cell = (col: number, row: number) => ({
  x: PAD + col * CS,
  y: PAD + row * CS,
  w: CS,
  h: CS,
});

/* colors pulled from theme tokens via currentColor where possible */
const COL = {
  bg: "hsl(var(--muted))",
  border: "hsl(var(--border))",
  active: "hsl(var(--primary))",
  activeFaint: "hsl(var(--primary) / 0.15)",
  success: "hsl(var(--primary) / 0.25)",
  text: "hsl(var(--foreground))",
  textMuted: "hsl(var(--muted-foreground))",
  cellBg: "hsl(var(--card))",
  black: "hsl(var(--foreground) / 0.85)",
};

/* helper: draw a mini grid */
function MiniGrid({ rows, cols, blacks = [] as [number, number][], id }: { rows: number; cols: number; blacks?: [number, number][]; id: string }) {
  const blackSet = new Set(blacks.map(([r, c]) => `${r}-${c}`));
  return (
    <g>
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          const { x, y, w, h } = cell(c, r);
          const isBlack = blackSet.has(`${r}-${c}`);
          return (
            <rect
              key={`${id}-${r}-${c}`}
              x={x} y={y} width={w} height={h}
              fill={isBlack ? COL.black : COL.cellBg}
              stroke={COL.border}
              strokeWidth={0.5}
              rx={1.5}
            />
          );
        })
      )}
    </g>
  );
}

/* helper: animated letter appearing */
function AnimLetter({ ch, col, row, delay, dur = DUR }: { ch: string; col: number; row: number; delay: string; dur?: string }) {
  const { x, y, w, h } = cell(col, row);
  return (
    <g>
      {/* highlight bg */}
      <rect x={x} y={y} width={w} height={h} rx={1.5} fill={COL.activeFaint} opacity={0}>
        <animate attributeName="opacity" values="0;0;1;1;0.5;0" keyTimes="0;0.01;0.15;0.7;0.85;1" dur={dur} begin={delay} repeatCount="indefinite" />
      </rect>
      {/* letter */}
      <text x={x + w / 2} y={y + h / 2 + 4.5} textAnchor="middle" fontSize="11" fontWeight="600" fill={COL.active} opacity={0}>
        {ch}
        <animate attributeName="opacity" values="0;0;1;1;1;0" keyTimes="0;0.01;0.2;0.7;0.85;1" dur={dur} begin={delay} repeatCount="indefinite" />
      </text>
    </g>
  );
}

/* highlight rect that pulses */
function SuccessFlash({ col, row, delay, cols = 1, rows = 1 }: { col: number; row: number; delay: string; cols?: number; rows?: number }) {
  const { x, y } = cell(col, row);
  return (
    <rect x={x} y={y} width={CS * cols} height={CS * rows} rx={2} fill={COL.success} opacity={0}>
      <animate attributeName="opacity" values="0;0;0.6;0.3;0" keyTimes="0;0.6;0.75;0.9;1" dur={DUR} begin={delay} repeatCount="indefinite" />
    </rect>
  );
}

/* ─── per-puzzle animations ─── */

function CrosswordAnim() {
  const word = "CAT";
  return (
    <svg viewBox={`0 0 ${S} ${S}`} width={S} height={S} className="block">
      <MiniGrid rows={5} cols={5} blacks={[[0, 0], [0, 3], [0, 4], [1, 4], [2, 0], [3, 0], [3, 1], [4, 0], [4, 1], [4, 4]]} id="cw" />
      {/* highlight row 1, cols 0-2 */}
      {[0, 1, 2].map((c) => {
        const { x, y, w, h } = cell(c, 1);
        return <rect key={c} x={x} y={y} width={w} height={h} rx={1.5} fill={COL.activeFaint} opacity={0}>
          <animate attributeName="opacity" values="0;0.4;0.4;0.4;0" keyTimes="0;0.05;0.6;0.85;1" dur={DUR} begin="0s" repeatCount="indefinite" />
        </rect>;
      })}
      <AnimLetter ch="C" col={0} row={1} delay="0.2s" />
      <AnimLetter ch="A" col={1} row={1} delay="0.6s" />
      <AnimLetter ch="T" col={2} row={1} delay="1.0s" />
      <SuccessFlash col={0} row={1} cols={3} rows={1} delay="0s" />
    </svg>
  );
}

function WordFillAnim() {
  return (
    <svg viewBox={`0 0 ${S} ${S}`} width={S} height={S} className="block">
      <MiniGrid rows={5} cols={5} blacks={[[0, 2], [1, 0], [2, 4], [3, 2], [4, 0], [4, 4]]} id="wf" />
      {/* word bank label */}
      <rect x={PAD} y={PAD + 5 * CS + 6} width={50} height={14} rx={3} fill={COL.activeFaint} opacity={0}>
        <animate attributeName="opacity" values="0;0.8;0.8;0;0" keyTimes="0;0.05;0.25;0.35;1" dur={DUR} repeatCount="indefinite" />
      </rect>
      <text x={PAD + 25} y={PAD + 5 * CS + 16} textAnchor="middle" fontSize="8" fill={COL.active} opacity={0}>
        SUN
        <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.05;0.25;0.35;1" dur={DUR} repeatCount="indefinite" />
      </text>
      <AnimLetter ch="S" col={0} row={0} delay="0.4s" />
      <AnimLetter ch="U" col={1} row={0} delay="0.7s" />
      <AnimLetter ch="N" col={2} row={0} delay="1.0s" />
      <SuccessFlash col={0} row={0} cols={2} rows={1} delay="0s" />
    </svg>
  );
}

function NumberFillAnim() {
  return (
    <svg viewBox={`0 0 ${S} ${S}`} width={S} height={S} className="block">
      <MiniGrid rows={5} cols={5} blacks={[[0, 3], [1, 1], [2, 0], [3, 3], [4, 1], [4, 4]]} id="nf" />
      <rect x={PAD} y={PAD + 5 * CS + 6} width={40} height={14} rx={3} fill={COL.activeFaint} opacity={0}>
        <animate attributeName="opacity" values="0;0.8;0.8;0;0" keyTimes="0;0.05;0.25;0.35;1" dur={DUR} repeatCount="indefinite" />
      </rect>
      <text x={PAD + 20} y={PAD + 5 * CS + 16} textAnchor="middle" fontSize="8" fill={COL.active} opacity={0}>
        382
        <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.05;0.25;0.35;1" dur={DUR} repeatCount="indefinite" />
      </text>
      <AnimLetter ch="3" col={0} row={2} delay="0.4s" />
      <AnimLetter ch="8" col={1} row={2} delay="0.7s" />
      <AnimLetter ch="2" col={2} row={2} delay="1.0s" />
      <SuccessFlash col={0} row={2} cols={3} rows={1} delay="0s" />
    </svg>
  );
}

function SudokuAnim() {
  // 3x3 sub-grid feel
  return (
    <svg viewBox={`0 0 ${S} ${S}`} width={S} height={S} className="block">
      <MiniGrid rows={4} cols={4} blacks={[]} id="su" />
      {/* pre-filled numbers */}
      {[[0,0,"1"],[0,2,"3"],[1,1,"4"],[2,0,"2"],[2,3,"1"],[3,2,"2"]] .map(([r,c,n]) => {
        const {x,y,w,h} = cell(c as number, r as number);
        return <text key={`p-${r}-${c}`} x={x+w/2} y={y+h/2+4.5} textAnchor="middle" fontSize="11" fontWeight="600" fill={COL.textMuted}>{n}</text>;
      })}
      {/* animated: highlight cell (1,2), then show "7" */}
      {(() => {
        const {x,y,w,h} = cell(2, 1);
        return (
          <g>
            <rect x={x} y={y} width={w} height={h} rx={1.5} fill={COL.activeFaint} opacity={0}>
              <animate attributeName="opacity" values="0;0.6;0.6;0.6;0" keyTimes="0;0.1;0.6;0.85;1" dur={DUR} repeatCount="indefinite" />
            </rect>
            <text x={x+w/2} y={y+h/2+4.5} textAnchor="middle" fontSize="11" fontWeight="700" fill={COL.active} opacity={0}>
              7
              <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.25;0.35;0.8;1" dur={DUR} repeatCount="indefinite" />
            </text>
          </g>
        );
      })()}
      <SuccessFlash col={2} row={1} delay="0s" />
    </svg>
  );
}

function WordSearchAnim() {
  const letters = [
    ["F","I","N","D","X"],
    ["A","B","C","E","F"],
    ["G","H","I","J","K"],
    ["L","M","N","O","P"],
    ["Q","R","S","T","U"],
  ];
  return (
    <svg viewBox={`0 0 ${S} ${S}`} width={S} height={S} className="block">
      <MiniGrid rows={5} cols={5} blacks={[]} id="ws" />
      {letters.map((row, r) => row.map((ch, c) => {
        const {x,y,w,h} = cell(c,r);
        return <text key={`${r}-${c}`} x={x+w/2} y={y+h/2+4} textAnchor="middle" fontSize="10" fill={COL.textMuted}>{ch}</text>;
      }))}
      {/* drag highlight across FIND (row 0, cols 0-3) */}
      {[0,1,2,3].map((c, i) => {
        const {x,y,w,h} = cell(c, 0);
        return (
          <rect key={c} x={x} y={y} width={w} height={h} rx={1.5} fill={COL.active} opacity={0}>
            <animate attributeName="opacity" values="0;0;0.3;0.3;0.15;0" keyTimes={`0;${0.1+i*0.08};${0.15+i*0.08};0.7;0.85;1`} dur={DUR} repeatCount="indefinite" />
          </rect>
        );
      })}
      <SuccessFlash col={0} row={0} cols={4} rows={1} delay="0s" />
    </svg>
  );
}

function KakuroAnim() {
  return (
    <svg viewBox={`0 0 ${S} ${S}`} width={S} height={S} className="block">
      <MiniGrid rows={4} cols={4} blacks={[[0,0],[0,1],[1,0],[3,3]]} id="ka" />
      {/* clue in (0,0) */}
      {(() => {
        const {x,y,w,h} = cell(0,0);
        return <>
          <line x1={x} y1={y} x2={x+w} y2={y+h} stroke={COL.border} strokeWidth={0.5} />
          <text x={x+w-3} y={y+h/2+1} textAnchor="end" fontSize="7" fill={COL.textMuted}>6</text>
        </>;
      })()}
      {/* highlight clue then fill 1,2,3 */}
      {(() => {
        const {x,y,w,h} = cell(0,0);
        return <rect x={x} y={y} width={w} height={h} rx={1.5} fill={COL.activeFaint} opacity={0}>
          <animate attributeName="opacity" values="0;0.5;0.5;0;0" keyTimes="0;0.05;0.2;0.3;1" dur={DUR} repeatCount="indefinite" />
        </rect>;
      })()}
      <AnimLetter ch="1" col={2} row={0} delay="0.3s" />
      <AnimLetter ch="2" col={3} row={0} delay="0.6s" />
      <AnimLetter ch="3" col={1} row={1} delay="0.9s" />
      <SuccessFlash col={2} row={0} cols={2} rows={1} delay="0s" />
    </svg>
  );
}

function NonogramAnim() {
  // row clues on left, animate filling cells
  return (
    <svg viewBox={`0 0 ${S} ${S}`} width={S} height={S} className="block">
      {/* offset grid to leave room for clues */}
      <g transform="translate(20,12)">
        {Array.from({ length: 4 }, (_, r) =>
          Array.from({ length: 4 }, (_, c) => {
            const x = c * CS;
            const y = r * CS;
            return <rect key={`${r}-${c}`} x={x} y={y} width={CS} height={CS} fill={COL.cellBg} stroke={COL.border} strokeWidth={0.5} rx={1.5} />;
          })
        )}
        {/* row clue for row 1: "3" */}
        <text x={-8} y={1 * CS + CS / 2 + 4} textAnchor="middle" fontSize="9" fontWeight="600" fill={COL.textMuted}>3</text>
        {/* highlight clue */}
        <rect x={-16} y={1 * CS + 2} width={16} height={CS - 4} rx={2} fill={COL.activeFaint} opacity={0}>
          <animate attributeName="opacity" values="0;0.6;0.6;0;0" keyTimes="0;0.05;0.2;0.3;1" dur={DUR} repeatCount="indefinite" />
        </rect>
        {/* fill 3 cells in row 1 */}
        {[0,1,2].map((c, i) => (
          <rect key={c} x={c * CS + 2} y={1 * CS + 2} width={CS - 4} height={CS - 4} rx={2} fill={COL.active} opacity={0}>
            <animate attributeName="opacity" values={`0;0;0.7;0.7;0.4;0`} keyTimes={`0;${0.2+i*0.12};${0.25+i*0.12};0.7;0.85;1`} dur={DUR} repeatCount="indefinite" />
          </rect>
        ))}
        {/* success */}
        <rect x={0} y={1 * CS} width={3 * CS} height={CS} rx={2} fill={COL.success} opacity={0}>
          <animate attributeName="opacity" values="0;0;0.5;0.25;0" keyTimes="0;0.65;0.75;0.9;1" dur={DUR} repeatCount="indefinite" />
        </rect>
      </g>
    </svg>
  );
}

function CryptogramAnim() {
  const encoded = "XBG";
  const decoded = "THE";
  return (
    <svg viewBox={`0 0 ${S} ${S}`} width={S} height={S} className="block">
      {/* encoded letters on top row */}
      {encoded.split("").map((ch, i) => {
        const { x, y, w, h } = cell(i + 1, 1);
        return <g key={i}>
          <rect x={x} y={y} width={w} height={h} fill={COL.cellBg} stroke={COL.border} strokeWidth={0.5} rx={1.5} />
          <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" fontSize="10" fill={COL.textMuted}>{ch}</text>
        </g>;
      })}
      {/* arrow */}
      <text x={PAD + 2.5 * CS} y={PAD + 2.6 * CS} textAnchor="middle" fontSize="10" fill={COL.textMuted}>↓</text>
      {/* decoded letters below */}
      {decoded.split("").map((ch, i) => {
        const { x, y, w, h } = cell(i + 1, 3);
        return <g key={i}>
          <rect x={x} y={y} width={w} height={h} fill={COL.cellBg} stroke={COL.border} strokeWidth={0.5} rx={1.5} />
          <AnimLetter ch={ch} col={i + 1} row={3} delay={`${0.3 + i * 0.4}s`} />
        </g>;
      })}
      <SuccessFlash col={1} row={3} cols={3} rows={1} delay="0s" />
    </svg>
  );
}

/* ─── export map ─── */

const animationMap: Record<PuzzleCategory, () => JSX.Element> = {
  crossword: CrosswordAnim,
  "word-fill": WordFillAnim,
  "number-fill": NumberFillAnim,
  sudoku: SudokuAnim,
  "word-search": WordSearchAnim,
  kakuro: KakuroAnim,
  nonogram: NonogramAnim,
  cryptogram: CryptogramAnim,
};

export function PuzzleAnimation({ type }: { type: PuzzleCategory }) {
  const Anim = animationMap[type];
  return Anim ? <Anim /> : null;
}
