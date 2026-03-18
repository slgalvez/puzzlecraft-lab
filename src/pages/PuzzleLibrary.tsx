import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { CATEGORY_INFO, type PuzzleCategory } from "@/lib/puzzleTypes";
import { randomSeed } from "@/lib/seededRandom";
import { Play } from "lucide-react";

const categories = Object.entries(CATEGORY_INFO) as [PuzzleCategory, typeof CATEGORY_INFO[PuzzleCategory]][];

const PuzzleLibrary = () => {
  const navigate = useNavigate();

  const handlePlay = (type: PuzzleCategory) => {
    const seed = randomSeed();
    navigate(`/generate/${type}?seed=${seed}`, {
      state: { instantPlay: true },
    });
  };

  return (
    <Layout>
      <div className="container py-10 md:py-14">
        <div className="max-w-xl">
          <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            Play
          </h1>
          <p className="mt-2 text-muted-foreground">
            Pick a puzzle and start solving instantly.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map(([type, info]) => (
            <button
              key={type}
              onClick={() => handlePlay(type)}
              className="group flex flex-col items-start rounded-xl border-2 border-border bg-card p-5 text-left transition-all hover:border-primary/50 hover:shadow-md active:scale-[0.98]"
            >
              <span className="text-3xl">{info.icon}</span>
              <h3 className="mt-3 font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                {info.name}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground leading-snug">
                {info.description}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                <Play size={12} className="fill-primary" />
                Play
              </span>
            </button>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default PuzzleLibrary;
