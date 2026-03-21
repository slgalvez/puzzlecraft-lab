import { SeededRandom } from "../seededRandom";
import type { Difficulty } from "../puzzleTypes";

export interface WordSearchPuzzle {
  grid: string[][];
  words: string[];
  wordPositions: { word: string; row: number; col: number; dr: number; dc: number }[];
  size: number;
}

const DIRECTIONS: [number, number][] = [
  [0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1],
];

const SIZES: Record<Difficulty, number> = { easy: 8, medium: 12, hard: 16, extreme: 20, insane: 22 };
const WORD_COUNTS: Record<Difficulty, number> = { easy: 5, medium: 10, hard: 16, extreme: 22, insane: 28 };
const DIR_COUNTS: Record<Difficulty, number> = { easy: 2, medium: 4, hard: 6, extreme: 8, insane: 8 };
const MIN_WORD_LEN: Record<Difficulty, number> = { easy: 3, medium: 4, hard: 5, extreme: 5, insane: 5 };
const MIN_PLACED: Record<Difficulty, number> = { easy: 3, medium: 6, hard: 10, extreme: 14, insane: 18 };

const MAX_ATTEMPTS = 15;

export function generateWordSearch(
  seed: number,
  difficulty: Difficulty,
  wordList: string[]
): WordSearchPuzzle {
  let bestResult: WordSearchPuzzle | null = null;
  let bestScore = -Infinity;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const result = tryGenerate(seed + attempt * 7919, difficulty, wordList);
    if (result.words.length < MIN_PLACED[difficulty]) continue;
    if (!validateGrid(result)) continue;

    const score = scorePuzzle(result, difficulty);
    if (score > bestScore) {
      bestScore = score;
      bestResult = result;
    }
    // Accept early if we hit target count with a good distribution score
    if (result.words.length >= WORD_COUNTS[difficulty] && score > 60) break;
  }

  if (bestResult) return bestResult;

  if (difficulty === "insane" || difficulty === "extreme") {
    return generateWordSearch(seed, "hard", wordList);
  }
  return tryGenerate(seed, difficulty, wordList);
}

/** Score layout quality — penalise clustering, reward even distribution */
function scorePuzzle(puzzle: WordSearchPuzzle, difficulty: Difficulty): number {
  const { size, wordPositions } = puzzle;
  if (wordPositions.length === 0) return -100;

  // --- Quadrant balance ---
  const quads = [0, 0, 0, 0];
  for (const wp of wordPositions) {
    const midR = wp.row + wp.dr * (wp.word.length - 1) / 2;
    const midC = wp.col + wp.dc * (wp.word.length - 1) / 2;
    const qi = (midR < size / 2 ? 0 : 2) + (midC < size / 2 ? 0 : 1);
    quads[qi]++;
  }
  const avg = wordPositions.length / 4;
  const imbalance = quads.reduce((s, q) => s + Math.abs(q - avg), 0);
  const emptyQuads = quads.filter(q => q === 0).length;

  // --- Clustering penalty: measure pairwise distances between word midpoints ---
  const midpoints = wordPositions.map(wp => ({
    r: wp.row + wp.dr * (wp.word.length - 1) / 2,
    c: wp.col + wp.dc * (wp.word.length - 1) / 2,
  }));

  let tooCloseCount = 0;
  const clusterThreshold = size * 0.2; // words closer than 20% of grid size
  for (let i = 0; i < midpoints.length; i++) {
    for (let j = i + 1; j < midpoints.length; j++) {
      const dist = Math.abs(midpoints[i].r - midpoints[j].r) + Math.abs(midpoints[i].c - midpoints[j].c);
      if (dist < clusterThreshold) tooCloseCount++;
    }
  }

  // --- Cell density per region (3x3 grid of regions) ---
  const regionSize = Math.ceil(size / 3);
  const regionCounts = Array(9).fill(0);
  for (const wp of wordPositions) {
    for (let i = 0; i < wp.word.length; i++) {
      const r = wp.row + wp.dr * i;
      const c = wp.col + wp.dc * i;
      const ri = Math.min(2, Math.floor(r / regionSize));
      const ci = Math.min(2, Math.floor(c / regionSize));
      regionCounts[ri * 3 + ci]++;
    }
  }
  const maxRegion = Math.max(...regionCounts);
  const totalCells = wordPositions.reduce((s, w) => s + w.word.length, 0);
  const avgRegion = totalCells / 9;
  const regionImbalance = regionCounts.reduce((s, r) => s + Math.abs(r - avgRegion), 0);

  // --- Direction diversity ---
  const dirSet = new Set(wordPositions.map(w => `${w.dr},${w.dc}`));

  // Scoring
  let score = 0;
  score += wordPositions.length * 8;              // reward word count
  score -= imbalance * 4;                          // penalise quadrant imbalance
  score -= emptyQuads * 15;                        // penalise empty quadrants
  score -= tooCloseCount * 5;                      // penalise clustered midpoints
  score -= (maxRegion / Math.max(1, avgRegion)) * 8; // penalise hotspot regions
  score -= regionImbalance * 0.3;                  // penalise uneven region density
  score += dirSet.size * 3;                        // reward direction variety

  return score;
}

/** Verify every placed word exists intact at its recorded position */
function validateGrid(puzzle: WordSearchPuzzle): boolean {
  const { grid, wordPositions, size } = puzzle;
  for (const wp of wordPositions) {
    for (let i = 0; i < wp.word.length; i++) {
      const r = wp.row + wp.dr * i;
      const c = wp.col + wp.dc * i;
      if (r < 0 || r >= size || c < 0 || c >= size) return false;
      if (grid[r][c] !== wp.word[i]) return false;
    }
  }
  const wordSet = new Set(wordPositions.map(w => w.word));
  if (wordSet.size !== wordPositions.length) return false;
  return true;
}

function tryGenerate(
  seed: number,
  difficulty: Difficulty,
  wordList: string[]
): WordSearchPuzzle {
  const rng = new SeededRandom(seed);
  const size = SIZES[difficulty];
  const wordCount = WORD_COUNTS[difficulty];
  const dirCount = DIR_COUNTS[difficulty];
  const minLen = MIN_WORD_LEN[difficulty];
  const dirs = DIRECTIONS.slice(0, dirCount);

  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(""));

  // Sort words longest-first for better placement
  const filtered = wordList.filter(w => w.length >= minLen && w.length <= size);
  const shuffled = rng.shuffle(filtered);
  shuffled.sort((a, b) => b.length - a.length);

  const placed: WordSearchPuzzle["wordPositions"] = [];
  const placedWords = new Set<string>();

  // Track cell usage density per region (3x3)
  const regionSize = Math.ceil(size / 3);
  const regionLoad = Array(9).fill(0);

  function getRegion(r: number, c: number): number {
    return Math.min(2, Math.floor(r / regionSize)) * 3 + Math.min(2, Math.floor(c / regionSize));
  }

  function wordRegionLoad(row: number, col: number, dr: number, dc: number, len: number): number {
    let load = 0;
    for (let i = 0; i < len; i++) {
      load += regionLoad[getRegion(row + dr * i, col + dc * i)];
    }
    return load;
  }

  // Build a cell-occupancy map for minimum-distance checks
  const occupied = new Set<string>();
  const MIN_GAP = Math.max(2, Math.floor(size / 6)); // 2-3 cells depending on grid

  function isNearOccupied(r: number, c: number): boolean {
    for (let dr2 = -MIN_GAP; dr2 <= MIN_GAP; dr2++) {
      for (let dc2 = -MIN_GAP; dc2 <= MIN_GAP; dc2++) {
        if (dr2 === 0 && dc2 === 0) continue;
        if (occupied.has(`${r + dr2},${c + dc2}`)) return true;
      }
    }
    return false;
  }

  function adjacencyPenalty(row: number, col: number, dr: number, dc: number, len: number): number {
    let nearCells = 0;
    let totalChecked = 0;
    for (let i = 0; i < len; i++) {
      const cr = row + dr * i;
      const cc = col + dc * i;
      // Skip cells that are valid overlaps (letter already matches)
      if (grid[cr][cc] !== "") continue;
      totalChecked++;
      if (isNearOccupied(cr, cc)) nearCells++;
    }
    return totalChecked > 0 ? nearCells / totalChecked : 0;
  }

  for (const word of shuffled) {
    if (placed.length >= wordCount) break;
    if (placedWords.has(word)) continue;

    const shuffledDirs = rng.shuffle([...dirs]);
    let bestPos: { r: number; c: number; dr: number; dc: number; score: number } | null = null;

    for (const [dr, dc] of shuffledDirs) {
      const positions: [number, number][] = [];
      for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++) positions.push([r, c]);

      // Sample more positions for better coverage
      const sampled = rng.shuffle(positions).slice(0, Math.min(positions.length, 60));

      for (const [r, c] of sampled) {
        if (!canPlace(grid, word, r, c, dr, dc, size)) continue;

        // Check overlap ratio
        let overlaps = 0;
        for (let i = 0; i < word.length; i++) {
          if (grid[r + dr * i][c + dc * i] !== "") overlaps++;
        }
        if (overlaps / word.length > 0.3) continue;

        // Adjacency: fraction of new cells that are near existing words
        const adjPen = adjacencyPenalty(r, c, dr, dc, word.length);

        // Region load
        const load = wordRegionLoad(r, c, dr, dc, word.length);

        // Midpoint proximity to already-placed words
        const midR = r + dr * (word.length - 1) / 2;
        const midC = c + dc * (word.length - 1) / 2;
        let proximityPenalty = 0;
        let minDist = Infinity;
        for (const pw of placed) {
          const pmR = pw.row + pw.dr * (pw.word.length - 1) / 2;
          const pmC = pw.col + pw.dc * (pw.word.length - 1) / 2;
          const dist = Math.abs(midR - pmR) + Math.abs(midC - pmC);
          if (dist < minDist) minDist = dist;
          if (dist < size * 0.3) proximityPenalty += (size * 0.3 - dist);
        }

        // Strong bonus for being far from all existing words
        const distBonus = placed.length > 0 ? Math.min(minDist, size) : size;

        const posScore =
          distBonus * 3            // reward distance from nearest word
          - load * 2               // penalise dense regions
          - overlaps * 3           // slight penalty for overlaps
          - proximityPenalty * 3   // penalise nearby midpoints
          - adjPen * size * 4;    // penalise cell-level adjacency

        if (!bestPos || posScore > bestPos.score) {
          bestPos = { r, c, dr, dc, score: posScore };
        }
      }
    }

    if (bestPos) {
      placeWord(grid, word, bestPos.r, bestPos.c, bestPos.dr, bestPos.dc);
      placed.push({ word, row: bestPos.r, col: bestPos.c, dr: bestPos.dr, dc: bestPos.dc });
      placedWords.add(word);
      for (let i = 0; i < word.length; i++) {
        const cr = bestPos.r + bestPos.dr * i;
        const cc = bestPos.c + bestPos.dc * i;
        occupied.add(`${cr},${cc}`);
        regionLoad[getRegion(cr, cc)]++;
      }
    }
  }

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (!grid[r][c]) grid[r][c] = letters[rng.nextInt(0, 25)];

  return { grid, words: placed.map(p => p.word), wordPositions: placed, size };
}

function canPlace(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  dr: number,
  dc: number,
  size: number
): boolean {
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    if (r < 0 || r >= size || c < 0 || c >= size) return false;
    if (grid[r][c] && grid[r][c] !== word[i]) return false;
  }
  return true;
}

function placeWord(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  dr: number,
  dc: number
) {
  for (let i = 0; i < word.length; i++) {
    grid[row + dr * i][col + dc * i] = word[i];
  }
}
