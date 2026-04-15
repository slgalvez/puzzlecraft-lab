import Layout from "@/components/layout/Layout";
import { Grid3X3, Trophy, Calendar, Share2, Sparkles } from "lucide-react";

const About = () => (
  <Layout>
    <div className="container max-w-2xl py-12">
      <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">About</h1>
      <p className="mt-4 text-lg text-foreground/90 leading-relaxed">
        Puzzlecraft is a competitive puzzle platform where you solve, rank, and share.
      </p>

      <div className="mt-10 space-y-8">
        <section className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Grid3X3 size={20} />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Eight puzzle types</h2>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Crossword, Sudoku, Word Search, Kakuro, Nonogram, Cryptogram, Word Fill-In, and Number Fill-In — each with multiple difficulty levels.
            </p>
          </div>
        </section>

        <section className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Trophy size={20} />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Competitive play</h2>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Every solve earns a score based on speed, accuracy, and difficulty. Your rating places you in a skill tier — from Beginner to Expert — and ranks you on the global leaderboard.
            </p>
          </div>
        </section>

        <section className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Calendar size={20} />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Daily Challenge</h2>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              A fresh puzzle every day. One attempt. Compete with other solvers on time and accuracy.
            </p>
          </div>
        </section>

        <section className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Share2 size={20} />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Create & Share</h2>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Build custom puzzles with the Craft tool and send them to friends via link. Track who solved them and compare times.
            </p>
          </div>
        </section>

        <section className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">Puzzlecraft+</h2>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Unlock all difficulty levels, unlimited puzzle crafting, full stats and analytics, and leaderboard access.
            </p>
          </div>
        </section>
      </div>
    </div>
  </Layout>
);

export default About;
