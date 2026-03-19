import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CATEGORY_INFO, type PuzzleCategory, type Difficulty, DIFFICULTY_LABELS } from "@/lib/puzzleTypes";

/**
 * Handles /play?code={category}-{seed}-{difficulty}
 * Redirects to the appropriate quick-play route or falls back to homepage.
 */
const SharedPuzzle = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get("code") || "";
    const parsed = parseShareCode(code);

    if (parsed) {
      navigate(`/quick-play/${parsed.category}?seed=${parsed.seed}&d=${parsed.difficulty}`, { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  }, [searchParams, navigate]);

  return null;
};

function parseShareCode(code: string): { category: PuzzleCategory; seed: number; difficulty: Difficulty } | null {
  if (!code) return null;

  // Format: {category}-{seed}-{difficulty}
  // Category can contain hyphens (e.g. "word-search", "word-fill", "number-fill")
  const allCategories = Object.keys(CATEGORY_INFO) as PuzzleCategory[];
  const allDifficulties = Object.keys(DIFFICULTY_LABELS) as Difficulty[];

  for (const cat of allCategories) {
    if (code.startsWith(cat + "-")) {
      const rest = code.slice(cat.length + 1); // e.g. "902053404-easy"
      const lastDash = rest.lastIndexOf("-");
      if (lastDash === -1) continue;

      const seedStr = rest.slice(0, lastDash);
      const diffStr = rest.slice(lastDash + 1);
      const seed = parseInt(seedStr, 10);

      if (!isNaN(seed) && allDifficulties.includes(diffStr as Difficulty)) {
        return { category: cat, seed, difficulty: diffStr as Difficulty };
      }
    }
  }

  return null;
}

export default SharedPuzzle;
