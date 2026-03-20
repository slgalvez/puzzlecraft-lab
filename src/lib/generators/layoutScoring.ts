/**
 * Shared layout quality scoring for grid-based puzzle generators.
 * Adapted from the craft puzzle quality engine for use across all generation flows.
 */

import { SeededRandom } from "../seededRandom";

// ── Grid analysis ──

export interface GridStats {
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
  balanceScore: number;
  jaggedEdges: number;
}

export function analyzeGrid(
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

  // Isolated single black cells (surrounded only by white)
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

  // Jagged edges
  let jaggedEdges = 0;
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const a = !!grid[r][c], b = !!grid[r][c + 1], d = !!grid[r + 1][c], e = !!grid[r + 1][c + 1];
      const transitions = [a !== b, b !== e, e !== d, d !== a].filter(Boolean).length;
      if (transitions >= 3) jaggedEdges++;
    }
  }

  // Connectivity
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

  // Symmetry score
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

  // Balance score
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

// ── Layout scoring ──

/**
 * Score a crossword/fill-in layout on a 0–100 scale.
 * Higher = cleaner, more balanced, newspaper-quality layout.
 */
export function scoreGridLayout(
  stats: GridStats,
  placedCount: number,
  targetCount: number
): number {
  const placementRatio = targetCount > 0 ? Math.min(1, placedCount / targetCount) : 0;

  // Balance (0–100): centering + symmetry
  const balanceRaw = Math.min(100, stats.balanceScore * 70 + stats.symmetryScore * 30);

  // Connectivity (0–100)
  let connectRaw = stats.fullyConnected ? 80 : 0;
  connectRaw += placementRatio * 20;
  connectRaw = Math.min(100, connectRaw);

  // Cleanliness (0–100)
  let cleanRaw = 100;
  cleanRaw -= stats.isolatedBlacks * 12;
  cleanRaw -= Math.max(0, stats.blackClusterMax - 4) * 5;
  cleanRaw -= Math.max(0, stats.thinDeadZones - 3) * 6;
  cleanRaw -= Math.max(0, stats.jaggedEdges - 4) * 3;
  if (stats.blackDensity > 0.85) cleanRaw -= (stats.blackDensity - 0.85) * 150;
  cleanRaw = Math.max(0, Math.min(100, cleanRaw));

  // Intersection quality (0–100)
  const intRaw = Math.min(100, stats.intersectionRatio * 200 + 20);

  // Readability (0–100)
  let readRaw = placementRatio * 70 + stats.symmetryScore * 30;
  readRaw -= stats.jaggedEdges * 2;
  readRaw = Math.max(0, Math.min(100, readRaw));

  // Weighted total
  const total =
    balanceRaw * 0.22 +
    connectRaw * 0.18 +
    cleanRaw * 0.25 +
    intRaw * 0.15 +
    readRaw * 0.20;

  // Hard penalties
  let penalty = 0;
  if (!stats.fullyConnected) penalty += 25;
  if (stats.isolatedBlacks > 4) penalty += 10;
  if (stats.blackClusterMax > 8) penalty += 10;
  if (placementRatio < 0.4) penalty += 20;

  return Math.max(0, Math.min(100, total - penalty));
}

/**
 * Generate multiple candidates and return the highest-scoring one.
 * Keeps generation fast by limiting candidates (3–5 per batch, up to 2 batches).
 */
export function selectBestCandidate<T>(
  buildFn: (seed: number) => { data: T; score: number },
  baseSeed: number,
  candidatesPerBatch = 4,
  maxBatches = 2,
  threshold = 50
): T {
  let bestData: T | null = null;
  let bestScore = -Infinity;

  for (let batch = 0; batch < maxBatches; batch++) {
    for (let i = 0; i < candidatesPerBatch; i++) {
      const seed = (baseSeed + batch * candidatesPerBatch * 7919 + i * 7919) % 2147483646 || 1;
      const { data, score } = buildFn(seed);
      if (score > bestScore) {
        bestScore = score;
        bestData = data;
      }
    }
    if (bestScore >= threshold) break;
  }

  return bestData!;
}

// ── Nonogram balance scoring ──

/**
 * Score a nonogram grid for visual balance (0–100).
 * Prefers evenly distributed filled cells rather than clumps.
 */
export function scoreNonogramLayout(solution: boolean[][], size: number): number {
  // Row fill variance (prefer consistent fill across rows)
  const rowFills = solution.map(row => row.filter(Boolean).length / size);
  const colFills = Array.from({ length: size }, (_, c) =>
    solution.filter(row => row[c]).length / size
  );

  const meanRowFill = rowFills.reduce((s, v) => s + v, 0) / size;
  const meanColFill = colFills.reduce((s, v) => s + v, 0) / size;

  const rowVariance = rowFills.reduce((s, v) => s + (v - meanRowFill) ** 2, 0) / size;
  const colVariance = colFills.reduce((s, v) => s + (v - meanColFill) ** 2, 0) / size;

  // Lower variance = more balanced = higher score
  const varianceScore = Math.max(0, 100 - (rowVariance + colVariance) * 500);

  // Check for completely empty or completely full rows/cols (ugly)
  let edgePenalty = 0;
  for (const fill of [...rowFills, ...colFills]) {
    if (fill === 0 || fill === 1) edgePenalty += 10;
  }

  // Clue complexity: prefer mix of clue lengths (not all "1" or all "N")
  const rowClues = solution.map(row => computeRunCount(row));
  const avgRuns = rowClues.reduce((s, v) => s + v, 0) / size;
  const diversityBonus = avgRuns >= 1.5 && avgRuns <= 4 ? 15 : 0;

  return Math.max(0, Math.min(100, varianceScore - edgePenalty + diversityBonus));
}

function computeRunCount(line: boolean[]): number {
  let runs = 0;
  let inRun = false;
  for (const cell of line) {
    if (cell && !inRun) { runs++; inRun = true; }
    if (!cell) inRun = false;
  }
  return runs;
}

// ── Kakuro layout scoring ──

/**
 * Score a kakuro layout for visual quality (0–100).
 */
export function scoreKakuroLayout(isBlack: boolean[][], size: number, whiteCount: number): number {
  const totalInner = (size - 1) * (size - 1);
  const whiteDensity = totalInner > 0 ? whiteCount / totalInner : 0;

  // Prefer white density between 0.4–0.7
  let densityScore = 100;
  if (whiteDensity < 0.3) densityScore -= (0.3 - whiteDensity) * 300;
  if (whiteDensity > 0.8) densityScore -= (whiteDensity - 0.8) * 300;
  densityScore = Math.max(0, densityScore);

  // Check balance: center of mass of white cells
  let comR = 0, comC = 0;
  for (let r = 1; r < size; r++)
    for (let c = 1; c < size; c++)
      if (!isBlack[r][c]) { comR += r; comC += c; }
  if (whiteCount > 0) { comR /= whiteCount; comC /= whiteCount; }
  const center = size / 2;
  const maxDist = center;
  const dist = Math.abs(comR - center) + Math.abs(comC - center);
  const balanceScore = Math.max(0, 100 * (1 - dist / (maxDist * 2)));

  return Math.min(100, densityScore * 0.5 + balanceScore * 0.5);
}
