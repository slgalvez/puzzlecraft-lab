import { describe, expect, it, vi } from "vitest";

import { generateCustomFillIn } from "../lib/generators/customPuzzles";

describe("generateCustomFillIn", () => {
  it("rejects disjoint word lists instead of returning a broken partial grid", () => {
    vi.spyOn(Date, "now").mockReturnValue(123456789);

    const words = ["ABC", "DEF", "GHI", "JKL", "MNO", "PQR", "STU", "VWX"];

    for (const difficulty of ["easy", "medium", "hard"] as const) {
      expect(() => generateCustomFillIn(words, difficulty)).toThrow(/valid full layout/i);
    }
  });
});