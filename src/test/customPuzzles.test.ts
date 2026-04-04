import { describe, expect, it, vi } from "vitest";

import { generateCustomFillIn } from "../lib/generators/customPuzzles";

describe("generateCustomFillIn", () => {
  it("places all submitted words even when they do not cross", () => {
    vi.spyOn(Date, "now").mockReturnValue(123456789);

    const words = ["ABC", "DEF", "GHI", "JKL", "MNO", "PQR", "STU", "VWX"];

    for (const difficulty of ["easy", "medium", "hard", "extreme", "insane"] as const) {
      const puzzle = generateCustomFillIn(words, difficulty);
      expect(puzzle.entries).toHaveLength(words.length);
      expect([...puzzle.entries].sort()).toEqual([...words].sort());
    }
  });

  it("handles large word sets without dropping", () => {
    vi.spyOn(Date, "now").mockReturnValue(987654321);

    const words = ["HELLO", "WORLD", "PUZZLE", "CRAFT", "SEARCH", "GRID", "FILL", "WORD", "TEST", "GAME"];

    const puzzle = generateCustomFillIn(words, "medium");
    expect(puzzle.entries).toHaveLength(words.length);
  });
});
