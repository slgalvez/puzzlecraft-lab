import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CATEGORY_INFO, DIFFICULTY_LABELS, type Difficulty, type PuzzleCategory, getEffectiveDifficulty } from "@/lib/puzzleTypes";
import { randomSeed } from "@/lib/seededRandom";

const allTypes = Object.keys(CATEGORY_INFO) as PuzzleCategory[];
const allDifficulties = Object.keys(DIFFICULTY_LABELS) as Difficulty[];

/**
 * Instant redirect component — picks a random type + difficulty
 * and navigates to QuickPlay in surprise mode.
 */
const SurprisePlay = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const type = allTypes[Math.floor(Math.random() * allTypes.length)];
    const diff = allDifficulties[Math.floor(Math.random() * allDifficulties.length)];
    const seed = randomSeed();
    navigate(`/quick-play/${type}?d=${diff}&seed=${seed}&mode=surprise`, { replace: true });
  }, [navigate]);

  return null;
};

export default SurprisePlay;
