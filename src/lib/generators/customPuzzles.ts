/**
 * Custom puzzle generators for crafted "For You" puzzles.
 *
 * Design philosophy: deterministic, quality-first generation.
 * - Difficulty controls STRUCTURE, not randomness
 * - Strict quality constraints with automatic rejection/regeneration
 * - Grid trimming to produce compact, intentional layouts
 * - User words are NEVER modified or supplemented
 */

import { SeededRandom } from "../seededRandom";

type CraftDifficulty = "easy" | "medium" | "hard";

// ═══════════════════════════════════════════════
// Quality constraints by difficulty
// ═══════════════════════════════════════════════

const MAX_BLACK_DENSITY: Record<CraftDifficulty, number> = { easy: 0.15, medium: 0.20, hard: 0.25 };
const TARGET_INTERSECTION_FILL: Record<CraftDifficulty, number> = { easy: 0.20, medium: 0.35, hard: 0.50 };
const TARGET_INTERSECTION_XWORD: Record<CraftDifficulty, number> = { easy: 0.30, medium: 0.50, hard: 0.70 };

/** Candidates per batch */
const CANDIDATES_PER_BATCH = 5;
/** Max batches before accepting best-so-far */
const MAX_BATCHES = 3;
/** Minimum acceptable score (0-100 scale) */
const QUALITY_THRESHOLD = 40;

// ═══════════════════════════════════════════════
// Scoring weights by difficulty
// ═══════════════════════════════════════════════

interface ScoringWeights {
  balance: number;     // Even distribution, centering
  connectivity: number; // Strong interconnection
  cleanliness: number;  // No noise, jagged edges, black clusters
  intersection: number; // Natural word crossings
  readability: number;  // Understandable at a glance
}

const SCORING_WEIGHTS: Record<CraftDifficulty, ScoringWeights> = {
  easy:   { balance: 0.20, connectivity: 0.15, cleanliness: 0.20, intersection: 0.15, readability: 0.30 },
  medium: { balance: 0.25, connectivity: 0.20, cleanliness: 0.20, intersection: 0.20, readability: 0.15 },
  hard:   { balance: 0.20, connectivity: 0.25, cleanliness: 0.15, intersection: 0.30, readability: 0.10 },
};

// ═══════════════════════════════════════════════
// Shared quality analysis
// ═══════════════════════════════════════════════

interface GridStats {
  size: number;
  whiteCells: number;
  blackCells: number;
  blackDensity: number;
  isolatedBlacks: number;
  blackClusterMax: number;
  thinDeadZones: number;
  fullyConnected: boolean;
  intersectionRatio: number;
  symmetryScore: number;
  balanceScore: number;   // 0-1: how centered/evenly distributed content is
  jaggedEdges: number;    // count of jagged boundary transitions
}

function analyzeGrid(
  grid: string[][],
  size: number,
  placed: { row: number; col: number; dir: "across" | "down"; word: string }[]
): GridStats {
  let whiteCells = 0;
  let blackCells = 0;

  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (grid[r][c]) whiteCells++;
      else blackCells++;

  const totalCells = size * size;
  const blackDensity = totalCells > 0 ? blackCells / totalCells : 0;

  // Isolated single black cells
  let isolatedBlacks = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c]) continue;
      const adj: [number, number][] = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
      const blackNeighbors = adj.filter(([nr, nc]) =>
        nr >= 0 && nr < size && nc >= 0 && nc < size && !grid[nr][nc]
      ).length;
      if (blackNeighbors === 0) {
        const whiteNeighbors = adj.filter(([nr, nc]) =>
          nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc]
        ).length;
        if (whiteNeighbors >= 2) isolatedBlacks++;
      }
    }
  }

  // Largest black cell cluster (flood-fill)
  let blackClusterMax = 0;
  const visitedBlack = new Set<string>();
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] || visitedBlack.has(`${r}-${c}`)) continue;
      let clusterSize = 0;
      const stack: [number, number][] = [[r, c]];
      while (stack.length) {
        const [cr, cc] = stack.pop()!;
        const key = `${cr}-${cc}`;
        if (visitedBlack.has(key)) continue;
        visitedBlack.add(key);
        clusterSize++;
        for (const [nr, nc] of [[cr - 1, cc], [cr + 1, cc], [cr, cc - 1], [cr, cc + 1]] as [number, number][]) {
          if (nr >= 0 && nr < size && nc >= 0 && nc < size && !grid[nr][nc] && !visitedBlack.has(`${nr}-${nc}`))
            stack.push([nr, nc]);
        }
      }
      blackClusterMax = Math.max(blackClusterMax, clusterSize);
    }
  }

  // Thin 1-cell-wide dead zones
  let thinDeadZones = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c]) continue;
      const adj: [number, number][] = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
      const whiteNeighbors = adj.filter(([nr, nc]) =>
        nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc]
      ).length;
      if (whiteNeighbors <= 1) thinDeadZones++;
    }
  }

  // Jagged edges: transitions at the white/black boundary
  let jaggedEdges = 0;
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const a = !!grid[r][c], b = !!grid[r][c + 1], d = !!grid[r + 1][c], e = !!grid[r + 1][c + 1];
      const transitions = [a !== b, b !== e, e !== d, d !== a].filter(Boolean).length;
      if (transitions >= 3) jaggedEdges++;
    }
  }

  // Connectivity via flood-fill
  const fullyConnected = checkConnectivity(grid, size);

  // Intersection ratio
  const cellUsage = new Map<string, number>();
  for (const p of placed) {
    const dr = p.dir === "down" ? 1 : 0;
    const dc = p.dir === "across" ? 1 : 0;
    for (let i = 0; i < p.word.length; i++) {
      const key = `${p.row + dr * i}-${p.col + dc * i}`;
      cellUsage.set(key, (cellUsage.get(key) || 0) + 1);
    }
  }
  const intersections = [...cellUsage.values()].filter(v => v >= 2).length;
  const intersectionRatio = whiteCells > 0 ? intersections / whiteCells : 0;

  // Symmetry score (0-1)
  let symmetricPairs = 0, totalPairs = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const mr = size - 1 - r, mc = size - 1 - c;
      if (r * size + c >= mr * size + mc) continue;
      totalPairs++;
      if (!!grid[r][c] === !!grid[mr][mc]) symmetricPairs++;
    }
  }
  const symmetryScore = totalPairs > 0 ? symmetricPairs / totalPairs : 1;

  // Balance score: how close is the center of mass to the grid center
  let comR = 0, comC = 0;
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (grid[r][c]) { comR += r; comC += c; }
  if (whiteCells > 0) { comR /= whiteCells; comC /= whiteCells; }
  const center = (size - 1) / 2;
  const maxDist = center * 2;
  const dist = Math.abs(comR - center) + Math.abs(comC - center);
  const balanceScore = maxDist > 0 ? Math.max(0, 1 - dist / maxDist) : 1;

  return {
    size, whiteCells, blackCells, blackDensity, isolatedBlacks, blackClusterMax,
    thinDeadZones, fullyConnected, intersectionRatio, symmetryScore, balanceScore, jaggedEdges,
  };
}

function checkConnectivity(grid: string[][], size: number): boolean {
  let startR = -1, startC = -1, totalWhite = 0;
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (grid[r][c]) {
        totalWhite++;
        if (startR === -1) { startR = r; startC = c; }
      }
  if (totalWhite <= 1) return true;

  const visited = new Set<string>();
  const stack: [number, number][] = [[startR, startC]];
  while (stack.length) {
    const [r, c] = stack.pop()!;
    const key = `${r}-${c}`;
    if (visited.has(key)) continue;
    visited.add(key);
    for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] && !visited.has(`${nr}-${nc}`)) {
        stack.push([nr, nc]);
      }
    }
  }
  return visited.size === totalWhite;
}

// ═══════════════════════════════════════════════
// Visual scoring engine (0–100 scale)
// ═══════════════════════════════════════════════

/**
 * Score a layout across 5 weighted dimensions.
 * Returns 0–100 where higher = better visual quality.
 */
function scoreLayout(
  stats: GridStats,
  difficulty: CraftDifficulty,
  placedCount: number,
  totalWords: number,
  targetIntersection: number
): number {
  const w = SCORING_WEIGHTS[difficulty];
  const placementRatio = totalWords > 0 ? placedCount / totalWords : 0;

  // ── A) Balance (0–100) ──
  let balanceRaw = stats.balanceScore * 70 + stats.symmetryScore * 30;
  // Penalty if content clusters in one quadrant
  balanceRaw = Math.min(100, balanceRaw);

  // ── B) Connectivity (0–100) ──
  let connectRaw = stats.fullyConnected ? 80 : 0;
  // Bonus for high placement ratio (more words = better connected)
  connectRaw += placementRatio * 20;
  connectRaw = Math.min(100, connectRaw);

  // ── C) Cleanliness (0–100) ──
  let cleanRaw = 100;
  // Isolated black cells: -15 each
  cleanRaw -= stats.isolatedBlacks * 15;
  // Large black clusters: -5 per cell above 3
  cleanRaw -= Math.max(0, stats.blackClusterMax - 3) * 5;
  // Thin dead zones: -8 each above 2
  cleanRaw -= Math.max(0, stats.thinDeadZones - 2) * 8;
  // Jagged edges: -4 each above 3
  cleanRaw -= Math.max(0, stats.jaggedEdges - 3) * 4;
  // Black density over limit
  const maxDensity = MAX_BLACK_DENSITY[difficulty];
  if (stats.blackDensity > maxDensity) cleanRaw -= (stats.blackDensity - maxDensity) * 200;
  cleanRaw = Math.max(0, Math.min(100, cleanRaw));

  // ── D) Intersection Quality (0–100) ──
  const intDiff = Math.abs(stats.intersectionRatio - targetIntersection);
  let intRaw = Math.max(0, 100 - intDiff * 300);
  // Bonus for exceeding target (better than missing)
  if (stats.intersectionRatio >= targetIntersection) intRaw = Math.min(100, intRaw + 10);
  intRaw = Math.min(100, intRaw);

  // ── E) Readability (0–100) ──
  let readRaw = 100;
  // Placement ratio is the biggest readability factor
  readRaw *= placementRatio;
  // Symmetry helps readability
  readRaw = readRaw * 0.7 + stats.symmetryScore * 30;
  // Jagged edges hurt readability
  readRaw -= stats.jaggedEdges * 3;
  readRaw = Math.max(0, Math.min(100, readRaw));

  // ── Weighted total ──
  const total =
    balanceRaw * w.balance +
    connectRaw * w.connectivity +
    cleanRaw * w.cleanliness +
    intRaw * w.intersection +
    readRaw * w.readability;

  // ── Hard penalties (applied after weighting) ──
  let penalty = 0;
  if (!stats.fullyConnected) penalty += 30;
  if (stats.isolatedBlacks > 3) penalty += 15;
  if (stats.blackClusterMax > 6) penalty += 10;
  if (placementRatio < 0.5) penalty += 20;

  return Math.max(0, Math.min(100, total - penalty));
}

/**
 * Generate multiple candidates, score them all, and return the best.
 * If no candidate meets the quality threshold after MAX_BATCHES,
 * returns the highest-scoring candidate found.
 */
function selectBestLayout<T>(
  buildFn: (seed: number) => { data: T; score: number },
  baseSeed: number
): T {
  let bestData: T | null = null;
  let bestScore = -Infinity;

  for (let batch = 0; batch < MAX_BATCHES; batch++) {
    for (let i = 0; i < CANDIDATES_PER_BATCH; i++) {
      const seed = (baseSeed + batch * CANDIDATES_PER_BATCH * 7919 + i * 7919) % 2147483646 || 1;
      const { data, score } = buildFn(seed);
      if (score > bestScore) {
        bestScore = score;
        bestData = data;
      }
    }
    // If we found a high-quality layout, stop early
    if (bestScore >= QUALITY_THRESHOLD) break;
  }

  return bestData!;
}

// ═══════════════════════════════════════════════
// Grid trimming
// ═══════════════════════════════════════════════

function trimGrid<T extends { row: number; col: number }>(
  grid: string[][],
  size: number,
  placed: T[]
): { grid: string[][]; size: number; placed: T[] } {
  let minR = size, maxR = 0, minC = size, maxC = 0;
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (grid[r][c]) {
        minR = Math.min(minR, r); maxR = Math.max(maxR, r);
        minC = Math.min(minC, c); maxC = Math.max(maxC, c);
      }
  if (minR > maxR) return { grid, size, placed };

  // 1-cell padding
  minR = Math.max(0, minR - 1);
  maxR = Math.min(size - 1, maxR + 1);
  minC = Math.max(0, minC - 1);
  maxC = Math.min(size - 1, maxC + 1);

  // Make square
  const h = maxR - minR + 1, w = maxC - minC + 1;
  const newSize = Math.max(h, w);
  const rowPad = Math.floor((newSize - h) / 2);
  const colPad = Math.floor((newSize - w) / 2);
  const offR = minR - rowPad;
  const offC = minC - colPad;

  const newGrid: string[][] = Array.from({ length: newSize }, () => Array(newSize).fill(""));
  for (let r = 0; r < newSize; r++)
    for (let c = 0; c < newSize; c++) {
      const or = r + offR, oc = c + offC;
      if (or >= 0 && or < size && oc >= 0 && oc < size) newGrid[r][c] = grid[or][oc];
    }

  const newPlaced = placed.map(p => ({ ...p, row: p.row - offR, col: p.col - offC }));
  return { grid: newGrid, size: newSize, placed: newPlaced };
}

// ═══════════════════════════════════════════════
// Placement engine
// ═══════════════════════════════════════════════

function writeWord(grid: string[][], word: string, row: number, col: number, dir: "across" | "down") {
  const dr = dir === "down" ? 1 : 0;
  const dc = dir === "across" ? 1 : 0;
  for (let i = 0; i < word.length; i++) grid[row + dr * i][col + dc * i] = word[i];
}

function canPlace(grid: string[][], word: string, row: number, col: number, dir: "across" | "down", size: number): boolean {
  const dr = dir === "down" ? 1 : 0;
  const dc = dir === "across" ? 1 : 0;
  if (row < 0 || col < 0 || row + dr * (word.length - 1) >= size || col + dc * (word.length - 1) >= size) return false;

  // Cell before word must be empty/border
  const pR = row - dr, pC = col - dc;
  if (pR >= 0 && pC >= 0 && grid[pR][pC]) return false;

  // Cell after word must be empty/border
  const aR = row + dr * word.length, aC = col + dc * word.length;
  if (aR < size && aC < size && grid[aR][aC]) return false;

  let intersections = 0;
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i, c = col + dc * i;
    if (grid[r][c]) {
      if (grid[r][c] !== word[i]) return false;
      intersections++;
    } else {
      // Perpendicular neighbors must be empty
      if (dir === "across") {
        if (r > 0 && grid[r - 1][c]) return false;
        if (r < size - 1 && grid[r + 1][c]) return false;
      } else {
        if (c > 0 && grid[r][c - 1]) return false;
        if (c < size - 1 && grid[r][c + 1]) return false;
      }
    }
  }
  return intersections > 0;
}

interface PlacementCandidate {
  row: number;
  col: number;
  dir: "across" | "down";
  intersections: number;
  balance: number; // how well it balances the grid
}

function findBestPlacement(
  grid: string[][],
  word: string,
  placed: { word: string; row: number; col: number; dir: "across" | "down" }[],
  size: number,
  rng: SeededRandom
): PlacementCandidate | null {
  const candidates: PlacementCandidate[] = [];

  // Compute grid center of mass for balance scoring
  let cx = 0, cy = 0, wCount = 0;
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (grid[r][c]) { cy += r; cx += c; wCount++; }
  const comR = wCount > 0 ? cy / wCount : size / 2;
  const comC = wCount > 0 ? cx / wCount : size / 2;
  const center = size / 2;

  for (const existing of placed) {
    for (let i = 0; i < word.length; i++) {
      for (let j = 0; j < existing.word.length; j++) {
        if (word[i] !== existing.word[j]) continue;
        const newDir: "across" | "down" = existing.dir === "across" ? "down" : "across";
        let nr: number, nc: number;
        if (newDir === "down") { nr = existing.row - i; nc = existing.col + j; }
        else { nr = existing.row + j; nc = existing.col - i; }

        if (!canPlace(grid, word, nr, nc, newDir, size)) continue;

        // Count intersections
        const dr = newDir === "down" ? 1 : 0;
        const dc = newDir === "across" ? 1 : 0;
        let ints = 0;
        let midR = 0, midC = 0;
        for (let k = 0; k < word.length; k++) {
          const cr = nr + dr * k, cc = nc + dc * k;
          if (grid[cr][cc] === word[k]) ints++;
          midR += cr; midC += cc;
        }
        midR /= word.length;
        midC /= word.length;

        // Balance: prefer placements that pull center of mass toward grid center
        const currentDist = Math.abs(comR - center) + Math.abs(comC - center);
        const newComR = (comR * wCount + midR * word.length) / (wCount + word.length);
        const newComC = (comC * wCount + midC * word.length) / (wCount + word.length);
        const newDist = Math.abs(newComR - center) + Math.abs(newComC - center);
        const balance = currentDist - newDist; // positive = improves balance

        candidates.push({ row: nr, col: nc, dir: newDir, intersections: ints, balance });
      }
    }
  }

  if (candidates.length === 0) return null;

  // Sort: most intersections first, then best balance
  candidates.sort((a, b) => {
    if (b.intersections !== a.intersections) return b.intersections - a.intersections;
    return b.balance - a.balance;
  });

  // Pick from top tier with slight randomness
  const topInts = candidates[0].intersections;
  const topTier = candidates.filter(c => c.intersections >= topInts);
  return topTier[rng.nextInt(0, topTier.length - 1)];
}

// ═══════════════════════════════════════════════
// Custom Word Fill-In
// ═══════════════════════════════════════════════

export interface CustomFillInData {
  gridSize: number;
  blackCells: [number, number][];
  entries: string[];
  solution: (string | null)[][];
}

export function generateCustomFillIn(words: string[], difficulty: CraftDifficulty = "medium"): CustomFillInData {
  const cleaned = words.map(w => w.toUpperCase().replace(/[^A-Z]/g, "")).filter(w => w.length >= 2);
  if (cleaned.length === 0) throw new Error("No valid words provided");

  const maxLen = Math.max(...cleaned.map(w => w.length));
  const padding = difficulty === "easy" ? 6 : difficulty === "medium" ? 4 : 3;
  const baseSize = Math.max(9, maxLen + padding);
  const targetInt = TARGET_INTERSECTION_FILL[difficulty];

  return selectBestLayout((seed) => {
    const { data, stats, placedCount } = buildFillIn(cleaned, baseSize, seed);
    const score = scoreLayout(stats, difficulty, placedCount, cleaned.length, targetInt);
    return { data, score };
  }, Date.now());
}

function buildFillIn(words: string[], size: number, seed: number) {
  const rng = new SeededRandom(seed);
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(""));
  const placed: { word: string; row: number; col: number; dir: "across" | "down" }[] = [];

  // Sort: longest first for structural anchoring
  const sorted = rng.shuffle([...words]).sort((a, b) => b.length - a.length);

  // Place first word centered horizontally
  if (sorted.length > 0) {
    const word = sorted[0];
    const row = Math.floor(size / 2);
    const col = Math.floor((size - word.length) / 2);
    writeWord(grid, word, row, col, "across");
    placed.push({ word, row, col, dir: "across" });
  }

  // Place remaining with quality-aware placement
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i < sorted.length; i++) {
      const word = sorted[i];
      if (placed.some(p => p.word === word)) continue;
      const result = findBestPlacement(grid, word, placed, size, rng);
      if (result) {
        writeWord(grid, word, result.row, result.col, result.dir);
        placed.push({ word, row: result.row, col: result.col, dir: result.dir });
      }
    }
  }

  // Trim
  const trimmed = trimGrid(grid, size, placed);

  const blackCells: [number, number][] = [];
  const solution: (string | null)[][] = Array.from({ length: trimmed.size }, () => Array(trimmed.size).fill(null));
  for (let r = 0; r < trimmed.size; r++)
    for (let c = 0; c < trimmed.size; c++)
      if (trimmed.grid[r][c]) solution[r][c] = trimmed.grid[r][c];
      else blackCells.push([r, c]);

  const stats = analyzeGrid(trimmed.grid, trimmed.size, trimmed.placed);

  return {
    data: { gridSize: trimmed.size, blackCells, entries: trimmed.placed.map(p => p.word), solution } as CustomFillInData,
    stats,
    placedCount: placed.length,
  };
}

// ═══════════════════════════════════════════════
// Custom Cryptogram
// ═══════════════════════════════════════════════

export interface CustomCryptogramData {
  encoded: string;
  decoded: string;
  cipher: Record<string, string>;
  reverseCipher: Record<string, string>;
  hints: Record<string, string>;
}

export function generateCustomCryptogram(phrase: string, difficulty: CraftDifficulty = "medium"): CustomCryptogramData {
  // Normalize smart/curly quotes to straight equivalents before filtering
  const normalized = phrase
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")   // curly single quotes → straight apostrophe
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"');   // curly double quotes → straight quote
  const decoded = normalized.toUpperCase().replace(/[^A-Z .,!?;:'"()-]/g, "");
  if (decoded.replace(/[^A-Z]/g, "").length < 3) throw new Error("Phrase too short");

  const rng = new SeededRandom(Date.now() % 2147483646 || 1);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  // Difficulty affects cipher quality:
  // Hard: cipher avoids common letter frequency patterns (E→E-like swaps)
  let shuffled: string[];
  let attempts = 0;
  do {
    shuffled = rng.shuffle([...alphabet]);
    attempts++;
    // Ensure no letter maps to itself
  } while (shuffled.some((c, i) => c === alphabet[i]) && attempts < 100);

  const cipher: Record<string, string> = {};
  const reverseCipher: Record<string, string> = {};
  for (let i = 0; i < 26; i++) {
    cipher[alphabet[i]] = shuffled[i];
    reverseCipher[shuffled[i]] = alphabet[i];
  }

  const encoded = decoded.split("").map(ch => cipher[ch] || ch).join("");

  // Hint count: easy=3, medium=2, hard=0
  const hintCount = difficulty === "easy" ? 3 : difficulty === "medium" ? 2 : 0;
  const uniqueLetters = [...new Set(decoded.split("").filter(ch => /[A-Z]/.test(ch)))];

  // Prefer revealing common letters for easier difficulty
  const letterFreq = uniqueLetters.map(l => ({
    letter: l,
    count: decoded.split("").filter(ch => ch === l).length,
  })).sort((a, b) => b.count - a.count);

  const hintLetters = difficulty === "easy"
    ? letterFreq.slice(0, hintCount).map(l => l.letter)
    : rng.shuffle(uniqueLetters).slice(0, hintCount);

  const hints: Record<string, string> = {};
  for (const letter of hintLetters) {
    hints[cipher[letter]] = letter;
  }

  return { encoded, decoded, cipher, reverseCipher, hints };
}

// ═══════════════════════════════════════════════
// Custom Crossword
// ═══════════════════════════════════════════════

export interface CustomCrosswordData {
  gridSize: number;
  blackCells: [number, number][];
  clues: { number: number; clue: string; answer: string; row: number; col: number; direction: "across" | "down" }[];
}

export function generateCustomCrossword(entries: { answer: string; clue: string }[], difficulty: CraftDifficulty = "medium"): CustomCrosswordData {
  const cleaned = entries
    .map(e => ({ answer: e.answer.toUpperCase().replace(/[^A-Z]/g, ""), clue: e.clue.trim() }))
    .filter(e => e.answer.length >= 2 && e.clue.length > 0);
  if (cleaned.length === 0) throw new Error("No valid entries");

  const maxLen = Math.max(...cleaned.map(e => e.answer.length));
  const padding = difficulty === "easy" ? 6 : difficulty === "medium" ? 4 : 3;
  const baseSize = Math.max(9, maxLen + padding);
  const targetInt = TARGET_INTERSECTION_XWORD[difficulty];

  return selectBestLayout((seed) => {
    const { data, stats, placedCount } = buildCrossword(cleaned, baseSize, seed, difficulty);
    const score = scoreLayout(stats, difficulty, placedCount, cleaned.length, targetInt) + stats.symmetryScore * 8;
    return { data, score };
  }, Date.now());
}

function buildCrossword(
  entries: { answer: string; clue: string }[],
  size: number,
  seed: number,
  difficulty: CraftDifficulty
) {
  const rng = new SeededRandom(seed);
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(""));
  const placed: { word: string; clue: string; row: number; col: number; dir: "across" | "down" }[] = [];

  const sorted = rng.shuffle([...entries]).sort((a, b) => b.answer.length - a.answer.length);

  // Place first word centered
  if (sorted.length > 0) {
    const { answer, clue } = sorted[0];
    const row = Math.floor(size / 2);
    const col = Math.floor((size - answer.length) / 2);
    writeWord(grid, answer, row, col, "across");
    placed.push({ word: answer, clue, row, col, dir: "across" });
  }

  // Multiple passes for denser interlocking
  const passes = difficulty === "hard" ? 3 : 2;
  for (let pass = 0; pass < passes; pass++) {
    for (let i = 1; i < sorted.length; i++) {
      const { answer, clue } = sorted[i];
      if (placed.some(p => p.word === answer)) continue;
      const result = findBestPlacement(grid, answer, placed, size, rng);
      if (result) {
        writeWord(grid, answer, result.row, result.col, result.dir);
        placed.push({ word: answer, clue, row: result.row, col: result.col, dir: result.dir });
      }
    }
  }

  // Trim
  const trimmed = trimGrid(grid, size, placed);

  const blackCells: [number, number][] = [];
  for (let r = 0; r < trimmed.size; r++)
    for (let c = 0; c < trimmed.size; c++)
      if (!trimmed.grid[r][c]) blackCells.push([r, c]);

  // Number cells
  const blackSet = new Set(blackCells.map(([r, c]) => `${r}-${c}`));
  const numbers = new Map<string, number>();
  let num = 1;
  for (let r = 0; r < trimmed.size; r++) {
    for (let c = 0; c < trimmed.size; c++) {
      if (blackSet.has(`${r}-${c}`)) continue;
      const startsAcross = (c === 0 || blackSet.has(`${r}-${c - 1}`)) && c + 1 < trimmed.size && !blackSet.has(`${r}-${c + 1}`);
      const startsDown = (r === 0 || blackSet.has(`${r - 1}-${c}`)) && r + 1 < trimmed.size && !blackSet.has(`${r + 1}-${c}`);
      if (startsAcross || startsDown) numbers.set(`${r}-${c}`, num++);
    }
  }

  const clues = trimmed.placed.map(p => ({
    number: numbers.get(`${p.row}-${p.col}`) || 0,
    clue: p.clue || "",
    answer: p.word,
    row: p.row,
    col: p.col,
    direction: p.dir,
  }));

  const stats = analyzeGrid(trimmed.grid, trimmed.size, trimmed.placed);

  return {
    data: { gridSize: trimmed.size, blackCells, clues } as CustomCrosswordData,
    stats,
    placedCount: placed.length,
  };
}

// ═══════════════════════════════════════════════
// Custom Word Search
// ═══════════════════════════════════════════════

export interface CustomWordSearchData {
  grid: string[][];
  words: string[];
  wordPositions: { word: string; row: number; col: number; dr: number; dc: number }[];
  size: number;
}

const WS_SIZE_MULT: Record<CraftDifficulty, number> = { easy: 1.5, medium: 1.3, hard: 1.1 };
const WS_MAX_OVERLAP: Record<CraftDifficulty, number> = { easy: 0.10, medium: 0.25, hard: 0.40 };

export function generateCustomWordSearch(words: string[], difficulty: CraftDifficulty = "medium"): CustomWordSearchData {
  const cleaned = words.map(w => w.toUpperCase().replace(/[^A-Z]/g, "")).filter(w => w.length >= 2);
  if (cleaned.length === 0) throw new Error("No valid words provided");

  const maxLen = Math.max(...cleaned.map(w => w.length));
  const sizeFromCount = Math.ceil(Math.sqrt(cleaned.length * cleaned.reduce((s, w) => s + w.length, 0)) * WS_SIZE_MULT[difficulty]);
  const size = Math.max(10, Math.max(maxLen + 2, sizeFromCount));

  // Direction sets by difficulty
  const DIRS_EASY: [number, number][] = [[0, 1], [1, 0]];
  const DIRS_MEDIUM: [number, number][] = [[0, 1], [1, 0], [1, 1], [-1, 1]];
  const DIRS_HARD: [number, number][] = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];
  const dirs = difficulty === "easy" ? DIRS_EASY : difficulty === "medium" ? DIRS_MEDIUM : DIRS_HARD;
  const maxOverlap = WS_MAX_OVERLAP[difficulty];

  return selectBestLayout((seed) => {
    const result = buildWordSearch(cleaned, size, dirs, maxOverlap, seed, difficulty);
    const score = result.placedCount * 10 + result.distributionScore;
    return { data: result.data, score };
  }, Date.now());
}

function buildWordSearch(
  words: string[],
  size: number,
  dirs: [number, number][],
  maxOverlap: number,
  seed: number,
  difficulty: CraftDifficulty
) {
  const rng = new SeededRandom(seed);
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(""));
  const placed: CustomWordSearchData["wordPositions"] = [];
  const placedWords = new Set<string>();

  const cellUsed = new Map<string, number>();

  // Sort longest first
  const sorted = rng.shuffle([...words]).sort((a, b) => b.length - a.length);

  for (const word of sorted) {
    if (placedWords.has(word)) continue;
    const shuffledDirs = rng.shuffle([...dirs]);
    let bestPos: { r: number; c: number; dr: number; dc: number; score: number } | null = null;

    for (const [dr, dc] of shuffledDirs) {
      const positions: [number, number][] = [];
      for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++) positions.push([r, c]);

      for (const [r, c] of rng.shuffle(positions)) {
        if (!canPlaceWS(grid, word, r, c, dr, dc, size)) continue;

        let overlaps = 0;
        for (let i = 0; i < word.length; i++) {
          const key = `${r + dr * i}-${c + dc * i}`;
          if (cellUsed.has(key)) overlaps++;
        }
        if (overlaps / word.length > maxOverlap) continue;

        const midR = r + dr * (word.length - 1) / 2;
        const midC = c + dc * (word.length - 1) / 2;
        const distFromCenter = Math.abs(midR - size / 2) + Math.abs(midC - size / 2);
        const posScore = (size - distFromCenter) - overlaps * 3;

        if (!bestPos || posScore > bestPos.score) {
          bestPos = { r, c, dr, dc, score: posScore };
        }
      }
    }

    if (bestPos) {
      placeWordWS(grid, word, bestPos.r, bestPos.c, bestPos.dr, bestPos.dc);
      placed.push({ word, row: bestPos.r, col: bestPos.c, dr: bestPos.dr, dc: bestPos.dc });
      placedWords.add(word);
      for (let i = 0; i < word.length; i++) {
        const key = `${bestPos.r + bestPos.dr * i}-${bestPos.c + bestPos.dc * i}`;
        cellUsed.set(key, (cellUsed.get(key) || 0) + 1);
      }
    }
  }

  // Fill empty cells
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const wordLetters = difficulty === "hard"
    ? [...new Set(words.join("").split(""))].join("") || letters
    : letters;
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (!grid[r][c]) grid[r][c] = wordLetters[rng.nextInt(0, wordLetters.length - 1)];

  // Post-placement validation
  for (const wp of placed) {
    for (let i = 0; i < wp.word.length; i++) {
      const r = wp.row + wp.dr * i;
      const c = wp.col + wp.dc * i;
      if (grid[r][c] !== wp.word[i]) {
        return { data: { grid, words: [], wordPositions: [], size } as CustomWordSearchData, placedCount: 0, distributionScore: -100 };
      }
    }
  }

  // Distribution score
  const quadrants = [0, 0, 0, 0];
  for (const wp of placed) {
    const midR = wp.row + wp.dr * (wp.word.length - 1) / 2;
    const midC = wp.col + wp.dc * (wp.word.length - 1) / 2;
    const qi = (midR < size / 2 ? 0 : 2) + (midC < size / 2 ? 0 : 1);
    quadrants[qi]++;
  }
  const avg = placed.length / 4;
  const distributionScore = 10 - quadrants.reduce((s, q) => s + Math.abs(q - avg), 0);

  return {
    data: { grid, words: placed.map(p => p.word), wordPositions: placed, size } as CustomWordSearchData,
    placedCount: placed.length,
    distributionScore,
  };
}

function canPlaceWS(grid: string[][], word: string, row: number, col: number, dr: number, dc: number, size: number): boolean {
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i, c = col + dc * i;
    if (r < 0 || r >= size || c < 0 || c >= size) return false;
    if (grid[r][c] && grid[r][c] !== word[i]) return false;
  }
  return true;
}

function placeWordWS(grid: string[][], word: string, row: number, col: number, dr: number, dc: number) {
  for (let i = 0; i < word.length; i++) grid[row + dr * i][col + dc * i] = word[i];
}
