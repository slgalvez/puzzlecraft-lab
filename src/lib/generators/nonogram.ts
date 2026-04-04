import { SeededRandom } from "../seededRandom";
import type { Difficulty } from "../puzzleTypes";
import { scoreNonogramLayout, selectBestCandidate } from "./layoutScoring";

export interface NonogramPuzzle {
  rows: number;
  cols: number;
  solution: boolean[][];
  rowClues: number[][];
  colClues: number[][];
}

const SIZES: Record<Difficulty, number> = { easy: 5, medium: 10, hard: 15, extreme: 20, insane: 25 };
const CANDIDATES: Record<Difficulty, number> = { easy: 3, medium: 4, hard: 4, extreme: 3, insane: 3 };

// ── 60 predefined 5×5 image patterns ──
// Each forms a recognizable shape when solved.

const PATTERNS_5x5: number[][][] = [
  // 0: Heart
  [[0,1,0,1,0],[1,1,1,1,1],[1,1,1,1,1],[0,1,1,1,0],[0,0,1,0,0]],
  // 1: Crown
  [[0,1,0,1,0],[0,1,0,1,0],[1,1,1,1,1],[1,1,1,1,1],[0,1,1,1,0]],
  // 2: Smiley
  [[0,1,1,1,0],[1,0,1,0,1],[1,0,0,0,1],[1,1,0,1,1],[0,1,1,1,0]],
  // 3: Star
  [[0,0,1,0,0],[0,1,1,1,0],[1,1,1,1,1],[0,1,1,1,0],[0,1,0,1,0]],
  // 4: Arrow up
  [[0,0,1,0,0],[0,1,1,1,0],[1,0,1,0,1],[0,0,1,0,0],[0,0,1,0,0]],
  // 5: Diamond
  [[0,0,1,0,0],[0,1,1,1,0],[1,1,1,1,1],[0,1,1,1,0],[0,0,1,0,0]],
  // 6: House
  [[0,0,1,0,0],[0,1,1,1,0],[1,1,1,1,1],[1,1,0,1,1],[1,1,0,1,1]],
  // 7: Cross
  [[0,0,1,0,0],[0,0,1,0,0],[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0]],
  // 8: Cat
  [[1,0,0,0,1],[1,1,0,1,1],[1,0,1,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  // 9: Anchor
  [[0,0,1,0,0],[0,1,1,1,0],[0,0,1,0,0],[1,0,1,0,1],[0,1,1,1,0]],
  // 10: Boat
  [[0,0,1,0,0],[0,0,1,1,0],[0,0,1,0,0],[1,1,1,1,1],[0,1,1,1,0]],
  // 11: Tree
  [[0,0,1,0,0],[0,1,1,1,0],[1,1,1,1,1],[0,0,1,0,0],[0,1,1,1,0]],
  // 12: Umbrella
  [[0,1,1,1,0],[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,1,1,0,0]],
  // 13: Mushroom
  [[0,1,1,1,0],[1,1,1,1,1],[0,1,1,1,0],[0,0,1,0,0],[0,1,1,1,0]],
  // 14: Music note
  [[0,0,1,1,0],[0,0,1,0,0],[0,0,1,0,0],[1,1,1,0,0],[1,1,0,0,0]],
  // 15: Bell
  [[0,0,1,0,0],[0,1,1,1,0],[0,1,1,1,0],[1,1,1,1,1],[0,0,1,0,0]],
  // 16: Flag
  [[1,1,1,1,0],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0]],
  // 17: Key
  [[0,1,1,0,0],[0,1,1,0,0],[0,0,1,0,0],[0,0,1,1,0],[0,0,1,0,0]],
  // 18: Cup / Trophy
  [[1,1,1,1,1],[1,1,1,1,1],[0,1,1,1,0],[0,0,1,0,0],[0,1,1,1,0]],
  // 19: Moon (crescent)
  [[0,0,1,1,0],[0,1,0,0,0],[1,0,0,0,0],[0,1,0,0,0],[0,0,1,1,0]],
  // 20: Sun
  [[0,0,1,0,0],[1,0,1,0,1],[0,1,1,1,0],[1,0,1,0,1],[0,0,1,0,0]],
  // 21: Lightning bolt
  [[0,0,1,1,0],[0,1,1,0,0],[1,1,1,1,0],[0,0,1,1,0],[0,1,1,0,0]],
  // 22: Skull
  [[0,1,1,1,0],[1,0,1,0,1],[1,1,1,1,1],[0,1,0,1,0],[0,1,1,1,0]],
  // 23: Flower
  [[0,1,0,1,0],[1,1,1,1,1],[0,1,1,1,0],[1,1,1,1,1],[0,1,0,1,0]],
  // 24: Butterfly
  [[1,0,0,0,1],[1,1,0,1,1],[1,1,1,1,1],[1,1,0,1,1],[1,0,0,0,1]],
  // 25: Fish
  [[0,0,1,0,0],[0,1,1,1,0],[1,1,1,1,1],[0,1,1,1,0],[0,0,1,0,0]],
  // 26: Bird
  [[0,0,0,1,0],[0,0,1,1,0],[1,1,1,1,1],[0,1,1,0,0],[0,1,0,0,0]],
  // 27: Hand / Peace
  [[0,1,0,1,0],[0,1,0,1,0],[0,1,1,1,0],[0,1,1,1,0],[0,0,1,0,0]],
  // 28: Shield
  [[1,1,1,1,1],[1,1,1,1,1],[1,1,1,1,1],[0,1,1,1,0],[0,0,1,0,0]],
  // 29: T-shirt
  [[1,1,0,1,1],[1,1,1,1,1],[0,1,1,1,0],[0,1,1,1,0],[0,1,1,1,0]],
  // 30: Pants
  [[1,1,1,1,1],[1,1,1,1,1],[1,1,0,1,1],[1,0,0,0,1],[1,0,0,0,1]],
  // 31: Gift box
  [[0,0,1,0,0],[1,1,1,1,1],[1,0,1,0,1],[1,0,1,0,1],[1,1,1,1,1]],
  // 32: Candle
  [[0,0,1,0,0],[0,0,1,0,0],[0,1,1,1,0],[0,1,1,1,0],[0,1,1,1,0]],
  // 33: Rocket
  [[0,0,1,0,0],[0,1,1,1,0],[0,1,1,1,0],[1,1,1,1,1],[1,0,0,0,1]],
  // 34: Hourglass
  [[1,1,1,1,1],[0,1,1,1,0],[0,0,1,0,0],[0,1,1,1,0],[1,1,1,1,1]],
  // 35: Alien
  [[0,1,1,1,0],[1,0,1,0,1],[1,1,1,1,1],[0,1,0,1,0],[1,0,0,0,1]],
  // 36: Ghost
  [[0,1,1,1,0],[1,1,1,1,1],[1,0,1,0,1],[1,1,1,1,1],[1,0,1,0,1]],
  // 37: Cactus
  [[0,0,1,0,0],[1,0,1,0,0],[1,1,1,0,0],[0,0,1,0,1],[0,0,1,1,1]],
  // 38: Cherry
  [[0,1,0,1,0],[1,0,1,0,0],[0,0,0,0,0],[1,1,0,1,1],[1,1,0,1,1]],
  // 39: Apple
  [[0,0,1,0,0],[0,1,1,1,0],[1,1,1,1,1],[1,1,1,1,1],[0,1,1,1,0]],
  // 40: Lock
  [[0,1,1,1,0],[0,1,0,1,0],[1,1,1,1,1],[1,1,1,1,1],[1,1,1,1,1]],
  // 41: Mountain
  [[0,0,1,0,0],[0,0,1,0,0],[0,1,1,1,0],[0,1,1,1,0],[1,1,1,1,1]],
  // 42: Snowflake
  [[1,0,1,0,1],[0,1,1,1,0],[1,1,1,1,1],[0,1,1,1,0],[1,0,1,0,1]],
  // 43: Bow tie
  [[1,0,0,0,1],[1,1,0,1,1],[0,1,1,1,0],[1,1,0,1,1],[1,0,0,0,1]],
  // 44: Wine glass
  [[1,1,1,1,1],[0,1,1,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,1,1,1,0]],
  // 45: Sword
  [[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,1,1,1,0],[0,0,1,0,0]],
  // 46: Eye
  [[0,0,0,0,0],[0,1,1,1,0],[1,1,0,1,1],[0,1,1,1,0],[0,0,0,0,0]],
  // 47: Pac-Man
  [[0,1,1,1,0],[1,1,1,0,0],[1,1,0,0,0],[1,1,1,0,0],[0,1,1,1,0]],
  // 48: Footprint
  [[0,1,0,1,0],[0,1,0,1,0],[0,0,0,0,0],[0,1,1,1,0],[0,1,1,1,0]],
  // 49: Puzzle piece
  [[0,1,1,0,0],[1,1,1,0,0],[0,1,1,1,0],[0,0,1,1,1],[0,0,1,1,0]],
  // 50: Raindrop
  [[0,0,1,0,0],[0,0,1,0,0],[0,1,1,1,0],[1,1,1,1,1],[0,1,1,1,0]],
  // 51: Leaf
  [[0,0,0,1,0],[0,0,1,1,0],[0,1,1,1,0],[1,1,1,0,0],[0,1,0,0,0]],
  // 52: Bone
  [[1,1,0,1,1],[0,1,1,1,0],[0,0,1,0,0],[0,1,1,1,0],[1,1,0,1,1]],
  // 53: Robot
  [[1,1,1,1,1],[1,0,1,0,1],[1,1,1,1,1],[0,1,1,1,0],[1,0,1,0,1]],
  // 54: Plane
  [[0,0,1,0,0],[0,1,1,0,0],[1,1,1,1,1],[0,1,1,0,0],[0,0,1,0,0]],
  // 55: Cake
  [[0,1,0,1,0],[1,1,1,1,1],[1,1,1,1,1],[1,0,1,0,1],[1,1,1,1,1]],
  // 56: Glasses
  [[0,0,0,0,0],[1,1,0,1,1],[1,1,1,1,1],[0,0,0,0,0],[0,0,0,0,0]],
  // 57: Briefcase
  [[0,1,1,1,0],[1,1,1,1,1],[1,1,1,1,1],[1,0,1,0,1],[1,1,1,1,1]],
  // 58: Envelope
  [[1,1,1,1,1],[1,1,0,1,1],[1,0,1,0,1],[1,0,0,0,1],[1,1,1,1,1]],
  // 59: Camera
  [[0,1,1,0,0],[1,1,1,1,1],[1,0,1,0,1],[1,0,1,0,1],[1,1,1,1,1]],
];

/**
 * For seeds beyond the pattern count, we procedurally generate unique patterns
 * by combining/transforming base patterns (flip, rotate, overlay).
 */
function getPattern(rng: SeededRandom): number[][] {
  const count = PATTERNS_5x5.length;
  const idx = rng.nextInt(0, count - 1);
  const base = PATTERNS_5x5[idx].map((r) => [...r]);

  // Apply random transformation to create more variety
  const transform = rng.nextInt(0, 3);
  switch (transform) {
    case 1: // Horizontal flip
      return base.map((row) => [...row].reverse());
    case 2: // Vertical flip
      return [...base].reverse();
    case 3: // Rotate 90° clockwise
      return Array.from({ length: 5 }, (_, r) =>
        Array.from({ length: 5 }, (_, c) => base[4 - c][r])
      );
    default:
      return base;
  }
}

/**
 * Scale a 5×5 pattern to a target size.
 *
 * - 5×5: use pattern directly with NO noise (every pixel matters).
 * - 10×10: thin 1px outline of the shape, very sparse interior dots.
 * - 15×15+: clean outline with light interior texture.
 *   Fill rate target: ~30-45%.
 */
function scalePattern(pattern: number[][], targetSize: number, rng: SeededRandom): boolean[][] {
  const baseSize = pattern.length; // always 5

  // For 5×5 just use the pattern directly — no noise at all
  if (targetSize <= 5) {
    return pattern.map((row) => row.map((v) => v === 1));
  }

  const scale = targetSize / baseSize; // pixels per base cell

  // Create a filled-region mask from the pattern
  const isFilled = (r: number, c: number) => {
    const sr = Math.min(Math.floor((r / targetSize) * baseSize), baseSize - 1);
    const sc = Math.min(Math.floor((c / targetSize) * baseSize), baseSize - 1);
    return pattern[sr][sc] === 1;
  };

  const grid: boolean[][] = Array.from({ length: targetSize }, () =>
    Array.from({ length: targetSize }, () => false)
  );

  // Draw the outline of the shape (1px border between filled/empty regions)
  for (let r = 0; r < targetSize; r++) {
    for (let c = 0; c < targetSize; c++) {
      if (!isFilled(r, c)) continue;
      // Check 4 cardinal neighbors only for a thin, clean outline
      const hasEmptyNeighbor =
        r === 0 || c === 0 || r === targetSize - 1 || c === targetSize - 1 ||
        !isFilled(r - 1, c) || !isFilled(r + 1, c) ||
        !isFilled(r, c - 1) || !isFilled(r, c + 1);
      if (hasEmptyNeighbor) grid[r][c] = true;
    }
  }

  // Add a second outline pixel for grids ≥ 15 to keep the shape visible
  if (targetSize >= 15) {
    const outline1 = grid.map((row) => [...row]);
    for (let r = 0; r < targetSize; r++) {
      for (let c = 0; c < targetSize; c++) {
        if (!isFilled(r, c) || grid[r][c]) continue;
        // Fill if adjacent to an existing outline cell
        const adj =
          (r > 0 && outline1[r - 1][c]) || (r < targetSize - 1 && outline1[r + 1][c]) ||
          (c > 0 && outline1[r][c - 1]) || (c < targetSize - 1 && outline1[r][c + 1]);
        if (adj) grid[r][c] = true;
      }
    }
  }

  // Add sparse interior detail — just widely-spaced dots, no crosshatch/stripes
  const dotSpacing = Math.max(3, Math.round(scale * 0.9));
  for (let r = 0; r < targetSize; r++) {
    for (let c = 0; c < targetSize; c++) {
      if (!isFilled(r, c) || grid[r][c]) continue;
      if (r % dotSpacing === 0 && c % dotSpacing === 0) {
        grid[r][c] = true;
      }
    }
  }

  // Very light noise (~2%) to break perfect regularity, never on small grids
  if (targetSize >= 15) {
    for (let r = 0; r < targetSize; r++) {
      for (let c = 0; c < targetSize; c++) {
        if (rng.next() < 0.02) grid[r][c] = !grid[r][c];
      }
    }
  }

  ensureMinimumClues(grid, targetSize, rng);
  return grid;
}

/** Make sure every row and column has at least one filled cell. */
function ensureMinimumClues(grid: boolean[][], size: number, rng: SeededRandom) {
  for (let r = 0; r < size; r++) {
    if (!grid[r].some(Boolean)) grid[r][rng.nextInt(0, size - 1)] = true;
  }
  for (let c = 0; c < size; c++) {
    if (!grid.some((row) => row[c])) grid[rng.nextInt(0, size - 1)][c] = true;
  }
}

export function generateNonogram(seed: number, difficulty: Difficulty): NonogramPuzzle {
  return selectBestCandidate(
    (s) => {
      const result = buildNonogram(s, difficulty);
      const score = scoreNonogramLayout(result.solution, result.rows);
      return { data: result, score };
    },
    seed,
    CANDIDATES[difficulty],
    2,
    55
  );
}

function buildNonogram(seed: number, difficulty: Difficulty): NonogramPuzzle {
  const rng = new SeededRandom(seed);
  const size = SIZES[difficulty];
  const pattern = getPattern(rng);
  const solution = scalePattern(pattern, size, rng);

  const rowClues = solution.map((row) => computeClue(row));
  const colClues = Array.from({ length: size }, (_, c) =>
    computeClue(solution.map((row) => row[c]))
  );

  return { rows: size, cols: size, solution, rowClues, colClues };
}

function computeClue(line: boolean[]): number[] {
  const clues: number[] = [];
  let count = 0;
  for (const cell of line) {
    if (cell) {
      count++;
    } else if (count > 0) {
      clues.push(count);
      count = 0;
    }
  }
  if (count > 0) clues.push(count);
  return clues.length > 0 ? clues : [0];
}
