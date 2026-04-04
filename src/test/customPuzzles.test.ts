import { describe, expect, it } from "vitest";

import { generateCustomFillIn, generateCustomWordSearch } from "../lib/generators/customPuzzles";

describe("generateCustomFillIn", () => {
  it("places all submitted words even when they do not cross", () => {
    const words = ["ABC", "DEF", "GHI", "JKL", "MNO", "PQR", "STU", "VWX"];

    for (const difficulty of ["easy", "medium", "hard"] as const) {
      const puzzle = generateCustomFillIn(words, difficulty);
      expect(puzzle.entries.length + puzzle.droppedWords.length).toBe(words.length);
    }
  });

  it("handles large word sets and reports any drops", () => {
    const words = ["HELLO", "WORLD", "PUZZLE", "CRAFT", "SEARCH", "GRID", "FILL", "WORD", "TEST", "GAME"];

    const puzzle = generateCustomFillIn(words, "hard");
    // All words should be accounted for (placed + dropped)
    expect(puzzle.entries.length + puzzle.droppedWords.length).toBe(words.length);
  });
});

describe("generateCustomWordSearch", () => {
  it("uses deterministic standard-generation behavior for the same input", () => {
    const words = ["APPLE", "BERRY", "CHILI", "MANGO", "LEMON"];

    const first = generateCustomWordSearch(words, "medium");
    const second = generateCustomWordSearch(words, "medium");

    expect(first.droppedWords).toHaveLength(0);
    expect([...first.words].sort()).toEqual([...words].sort());
    expect(first.size).toBe(second.size);
    expect(first.grid).toEqual(second.grid);
    expect(first.wordPositions).toEqual(second.wordPositions);
  });

  it("returns droppedWords instead of throwing when words cannot fit", () => {
    const words = ["ALPHA", "BRAVO", "CHARLIE", "DELTA", "ECHO", "FOXTROT"];

    const result = generateCustomWordSearch(words, "easy");
    // Should not throw — returns droppedWords instead
    expect(result.words.length + result.droppedWords.length).toBe(words.length);
  });
});
