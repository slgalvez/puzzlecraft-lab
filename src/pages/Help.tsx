import Layout from "@/components/layout/Layout";
import { Grid3X3, Hash, Type } from "lucide-react";

const sections = [
  {
    icon: Grid3X3,
    title: "How to Play: Crossword",
    steps: [
      "Click any white cell to select it.",
      "Type a letter to fill the cell — the cursor advances automatically.",
      "Press Tab to switch between Across and Down direction.",
      "Press Backspace to clear and move back.",
      "Use the clue lists to guide your answers.",
    ],
  },
  {
    icon: Hash,
    title: "How to Play: Number Fill-In",
    steps: [
      "You are given a list of numbers to place into the grid.",
      "Click a cell and type digits to fill it in.",
      "Each number from the bank must appear exactly once in the grid.",
      "Click a number in the bank to cross it off as you place it.",
    ],
  },
  {
    icon: Type,
    title: "How to Play: Word Fill-In",
    steps: [
      "You are given a list of words to place into the grid.",
      "Click a cell and type letters — the cursor moves automatically.",
      "Each word from the bank must appear exactly once.",
      "Click a word in the bank to cross it off as you place it.",
    ],
  },
];

const Help = () => (
  <Layout>
    <div className="container max-w-2xl py-12">
      <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">Help</h1>
      <p className="mt-2 text-muted-foreground">Learn how to play each puzzle type.</p>

      <div className="mt-10 space-y-10">
        {sections.map(({ icon: Icon, title, steps }) => (
          <div key={title}>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon size={18} />
              </div>
              <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
            </div>
            <ol className="mt-4 space-y-2 pl-12">
              {steps.map((step, i) => (
                <li key={i} className="text-sm text-muted-foreground list-decimal leading-relaxed">
                  {step}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  </Layout>
);

export default Help;
