import { SeededRandom } from "../seededRandom";
import type { Difficulty } from "../puzzleTypes";
import { QUOTES } from "../wordList";

export interface CryptogramPuzzle {
  encoded: string;
  decoded: string;
  cipher: Record<string, string>;
  reverseCipher: Record<string, string>;
  hints: Record<string, string>;
}

const HINT_COUNTS: Record<Difficulty, number> = {
  easy: 6, medium: 3, hard: 1, extreme: 0, insane: 0,
};

export function generateCryptogram(seed: number, difficulty: Difficulty, forcedQuote?: string): CryptogramPuzzle {
  const rng = new SeededRandom(seed);

  let decoded: string;

  if (forcedQuote && forcedQuote.length > 10) {
    decoded = forcedQuote.toUpperCase();
  } else {
    // Pick quote based on difficulty (longer quotes for harder levels)
    const sorted = [...QUOTES].sort((a, b) => a.length - b.length);
    const rangeStart: Record<Difficulty, number> = { easy: 0, medium: 0.15, hard: 0.35, extreme: 0.6, insane: 0.8 };
    const rangeEnd: Record<Difficulty, number> = { easy: 0.3, medium: 0.5, hard: 0.7, extreme: 0.9, insane: 1 };
    const lo = Math.floor(sorted.length * rangeStart[difficulty]);
    const hi = Math.min(Math.floor(sorted.length * rangeEnd[difficulty]), sorted.length - 1);
    const idx = rng.nextInt(lo, hi);
    decoded = sorted[idx];
  }

  // Create substitution cipher
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  let shuffled: string[];
  do {
    shuffled = rng.shuffle([...alphabet]);
  } while (shuffled.some((c, i) => c === alphabet[i])); // No fixed points

  const cipher: Record<string, string> = {};
  const reverseCipher: Record<string, string> = {};
  for (let i = 0; i < 26; i++) {
    cipher[alphabet[i]] = shuffled[i];
    reverseCipher[shuffled[i]] = alphabet[i];
  }

  const encoded = decoded
    .split("")
    .map((ch) => (cipher[ch] ? cipher[ch] : ch))
    .join("");

  // Generate hints
  const uniqueLetters = [...new Set(decoded.split("").filter((ch) => /[A-Z]/.test(ch)))];
  const hintLetters = rng.shuffle(uniqueLetters).slice(0, HINT_COUNTS[difficulty]);
  const hints: Record<string, string> = {};
  for (const letter of hintLetters) {
    hints[cipher[letter]] = letter;
  }

  return { encoded, decoded, cipher, reverseCipher, hints };
}
