import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { CATEGORY_INFO, type PuzzleCategory } from "@/lib/puzzleTypes";
import PuzzleCard from "@/components/puzzles/PuzzleCard";
import RandomPuzzleGenerator from "@/components/puzzles/RandomPuzzleGenerator";
import { allPuzzles } from "@/data/puzzles";

const categories = Object.entries(CATEGORY_INFO) as [PuzzleCategory, typeof CATEGORY_INFO[PuzzleCategory]][];

const PuzzleLibrary = () => {
  return (
    <Layout>
      <div className="container py-12">
        <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">Puzzle Types</h1>
        <p className="mt-2 text-muted-foreground">
          Choose a puzzle type to start playing — unlimited puzzles with adjustable difficulty.
        </p>

        {/* Random Puzzle Generator */}
        <div className="mt-8">
          <RandomPuzzleGenerator />
        </div>

        {/* Puzzle type cards */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map(([type, info]) => (
            <Link
              key={type}
              to={`/generate/${type}`}
              className="group rounded-lg border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-md"
            >
              <span className="text-3xl">{info.icon}</span>
              <h3 className="mt-3 font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                {info.name}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{info.description}</p>
              <span className="mt-3 inline-block text-xs font-medium text-primary">
                Play now →
              </span>
            </Link>
          ))}
        </div>

        {/* Sample puzzles section */}
        {allPuzzles.length > 0 && (
          <div className="mt-16">
            <h2 className="font-display text-2xl font-bold text-foreground">Sample Puzzles</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Hand-crafted puzzles to get started.
            </p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {allPuzzles.map((p) => (
                <PuzzleCard key={p.id} puzzle={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PuzzleLibrary;
