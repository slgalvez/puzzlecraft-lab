import Layout from "@/components/layout/Layout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Grid3X3, Hash, Type, Calculator, Search, Plus, Palette, Lock } from "lucide-react";

const puzzleTypes = [
  {
    icon: Grid3X3,
    title: "Crossword",
    steps: [
      "Click a white cell and type a letter — the cursor advances automatically.",
      "Press Tab to switch between Across and Down.",
      "Use clue lists to guide your answers.",
    ],
    tips: [
      "Start with fill-in-the-blank clues — they're usually the easiest.",
      "Work on crossing words to reveal shared letters.",
    ],
  },
  {
    icon: Calculator,
    title: "Sudoku",
    steps: [
      "Fill every row, column, and 3×3 box with digits 1–9.",
      "Each digit may appear only once per row, column, and box.",
      "Pre-filled numbers cannot be changed.",
    ],
    tips: [
      "Scan for rows or columns missing a single digit — that's a guaranteed answer.",
      "At higher difficulties, look for naked pairs and triples.",
    ],
  },
  {
    icon: Search,
    title: "Word Search",
    steps: [
      "Find all listed words hidden in the grid.",
      "Words run horizontally, vertically, or diagonally.",
      "Click the first letter, then the last letter to select.",
    ],
    tips: [
      "Scan for uncommon letters (Q, Z, X) first to narrow positions.",
      "Start with the longest words — they're easier to spot.",
    ],
  },
  {
    icon: Plus,
    title: "Kakuro",
    steps: [
      "Fill cells with digits 1–9 so each run sums to its clue.",
      "No digit may repeat within a single run.",
      "Clue cells show row sums (bottom-left) and column sums (top-right).",
    ],
    tips: [
      "Memorize key combos: a 2-cell sum of 3 is always 1+2, a 2-cell sum of 17 is always 8+9.",
      "Start with short runs — they have fewer possible combinations.",
    ],
  },
  {
    icon: Palette,
    title: "Nonogram",
    steps: [
      "Use row and column clues to determine which cells to fill.",
      "Click to fill, click again to mark empty (✕), click again to clear.",
      "Complete the grid to reveal a hidden picture.",
    ],
    tips: [
      "Start with rows where clues nearly fill the entire width — overlap is guaranteed.",
      "Mark known-empty cells with ✕ to avoid confusion.",
    ],
  },
  {
    icon: Lock,
    title: "Cryptogram",
    steps: [
      "Each letter has been substituted with another letter.",
      "Type your guess — all instances of that letter update together.",
      "Hint letters (amber) are pre-filled and locked.",
    ],
    tips: [
      "Single-letter words are almost always 'A' or 'I'.",
      "Look for common patterns: THE, AND, -ING, -TION.",
    ],
  },
  {
    icon: Hash,
    title: "Number Fill-In",
    steps: [
      "Place each number from the bank into matching grid slots.",
      "Match digit count to slot length.",
      "Each number must appear exactly once.",
    ],
    tips: [
      "Start with numbers that have a unique length — only one slot fits.",
      "Use intersecting digits to narrow down possibilities.",
    ],
  },
  {
    icon: Type,
    title: "Word Fill-In",
    steps: [
      "Place each word from the bank into the grid.",
      "Match word length to slot length.",
      "Each word must appear exactly once.",
    ],
    tips: [
      "Start with uniquely-lengthed words — they can only go in one slot.",
      "Uncommon letters (Q, Z, X) help pinpoint positions.",
    ],
  },
];

const faqItems = [
  {
    question: "How does the ranking system work?",
    answer: "Every solve earns a score based on speed, accuracy, and difficulty. Your first 5 solves are provisional — after that, your rating is confirmed and placed into a skill tier: Beginner, Casual, Skilled, Advanced, or Expert.",
  },
  {
    question: "How do leaderboards work?",
    answer: "Complete 10 or more puzzles to appear on the global leaderboard. Your ranking is based on a rolling average of your most recent solves, so consistent performance matters more than a single high score.",
  },
  {
    question: "What is the daily challenge?",
    answer: "A new puzzle is available every day. You get one attempt. Your solve time and accuracy are compared against other players on the daily leaderboard.",
  },
  {
    question: "How do I share puzzles?",
    answer: "Use the Craft tool to build a custom puzzle — choose a type, enter your content, and generate a shareable link. Recipients can solve it directly in their browser, and you can track their times.",
  },
  {
    question: "What is Puzzlecraft+?",
    answer: "Puzzlecraft+ is the premium tier. It unlocks all difficulty levels, unlimited puzzle crafting, full stats and analytics, and access to the global leaderboard.",
  },
];

const Help = () => (
  <Layout>
    <div className="container max-w-2xl py-12">
      <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">Help</h1>
      <p className="mt-2 text-muted-foreground">
        Learn how to play each puzzle type and get answers to common questions.
      </p>

      {/* How to Play */}
      <h2 className="mt-10 font-display text-xl font-semibold text-foreground">How to Play</h2>
      <Accordion type="multiple" className="mt-4">
        {puzzleTypes.map(({ icon: Icon, title, steps, tips }) => (
          <AccordionItem key={title} value={title}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon size={16} />
                </div>
                <span className="font-display font-medium">{title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pl-11 space-y-3">
                <ol className="space-y-1.5">
                  {steps.map((step, i) => (
                    <li key={i} className="text-sm text-muted-foreground list-decimal ml-4 leading-relaxed">
                      {step}
                    </li>
                  ))}
                </ol>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1.5">Tips</p>
                  <ul className="space-y-1">
                    {tips.map((tip, i) => (
                      <li key={i} className="text-sm text-muted-foreground list-disc ml-4 leading-relaxed">
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* FAQ */}
      <h2 className="mt-12 font-display text-xl font-semibold text-foreground">Frequently Asked Questions</h2>
      <Accordion type="multiple" className="mt-4">
        {faqItems.map(({ question, answer }) => (
          <AccordionItem key={question} value={question}>
            <AccordionTrigger className="hover:no-underline text-left">
              {question}
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{answer}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  </Layout>
);

export default Help;
