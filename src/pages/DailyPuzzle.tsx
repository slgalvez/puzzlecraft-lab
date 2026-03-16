import Layout from "@/components/layout/Layout";
import CrosswordGrid from "@/components/puzzles/CrosswordGrid";
import { sampleCrossword, dailyPuzzle } from "@/data/puzzles";

const DailyPuzzle = () => (
  <Layout>
    <div className="container py-12">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-widest text-primary">{dailyPuzzle.date}</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-foreground sm:text-4xl">Daily Crossword</h1>
        <p className="mt-2 text-muted-foreground">
          A fresh puzzle every day. Click a cell and start typing — press Tab to switch direction.
        </p>
      </div>
      <CrosswordGrid puzzle={sampleCrossword} />
    </div>
  </Layout>
);

export default DailyPuzzle;
