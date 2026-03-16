import Layout from "@/components/layout/Layout";
import { Grid3X3, Hash, Type, Calculator, Search, Plus, Palette, Lock } from "lucide-react";

const sections = [
  {
    icon: Grid3X3,
    title: "Crossword",
    steps: [
      "Click any white cell to select it.",
      "Type a letter to fill the cell — the cursor advances automatically.",
      "Press Tab to switch between Across and Down direction.",
      "Press Backspace to clear and move back.",
      "Use the clue lists on the side to guide your answers.",
    ],
    tips: [
      "Start with shorter words — they have fewer possibilities and help lock in intersecting letters.",
      "If you're stuck, work on the perpendicular direction to reveal crossing letters.",
      "Fill-in-the-blank clues are usually the easiest place to start.",
    ],
  },
  {
    icon: Calculator,
    title: "Sudoku",
    steps: [
      "Fill every row, column, and 3×3 box with the digits 1–9.",
      "Click an empty cell and type a digit to place it.",
      "Each digit may appear only once per row, column, and box.",
      "Pre-filled numbers (given clues) cannot be changed.",
    ],
    tips: [
      "Scan each row, column, and box for missing digits — if only one slot remains, that's your answer.",
      "Use 'pencil marks' mentally: think about which digits could go in each empty cell and eliminate impossible ones.",
      "Look for 'naked singles' — cells where only one digit is possible after checking row, column, and box constraints.",
      "At higher difficulties, look for pairs or triples of cells that restrict each other.",
    ],
  },
  {
    icon: Search,
    title: "Word Search",
    steps: [
      "Find all the listed words hidden in the letter grid.",
      "Words can run horizontally, vertically, or diagonally.",
      "Click the first letter of a word, then click the last letter to select it.",
      "Found words are highlighted and crossed off the list.",
    ],
    tips: [
      "Scan for uncommon letters first (Q, Z, X, J) — they narrow down word positions quickly.",
      "Work through the word list systematically, starting with the longest words.",
      "Once you find a word's first letter, check all 8 directions from that cell.",
    ],
  },
  {
    icon: Plus,
    title: "Kakuro",
    steps: [
      "Fill white cells with digits 1–9 so each horizontal or vertical run sums to the clue shown.",
      "No digit may repeat within a single run.",
      "Clue cells show the target sum — the number in the bottom-left is for the row, top-right is for the column.",
      "Click a white cell and type a digit.",
    ],
    tips: [
      "Memorize key combinations: a 2-cell sum of 3 must be 1+2, a 2-cell sum of 17 must be 8+9.",
      "Start with runs that have only one possible combination (e.g., sum 3 in 2 cells, sum 6 in 3 cells).",
      "Use intersections — if a cell belongs to two runs, the digit must satisfy both constraints.",
      "Small sums and large sums in short runs have fewer possibilities, so tackle those first.",
    ],
  },
  {
    icon: Palette,
    title: "Nonogram (Picross)",
    steps: [
      "Use the number clues on each row and column to determine which cells should be filled.",
      "Click a cell to fill it. Click again to mark it with ✕ (empty). Click again to clear.",
      "The numbers indicate consecutive groups of filled cells, separated by at least one empty cell.",
      "Complete the grid to reveal a hidden picture.",
    ],
    tips: [
      "Start with rows or columns where the clues take up most of the space — overlap is guaranteed.",
      "Mark cells you know are empty with ✕ to avoid confusion.",
      "If a clue is '0' or empty, the entire row/column is empty.",
      "Work from both edges inward when a large clue number nearly fills the row.",
    ],
  },
  {
    icon: Lock,
    title: "Cryptogram",
    steps: [
      "Each letter in the message has been replaced with a different letter.",
      "Type your guess for each encoded letter — all instances update together.",
      "Hint letters (shown in amber) are pre-filled and cannot be changed.",
      "Use the letter frequency helper to see which encoded letters appear most often.",
    ],
    tips: [
      "Single-letter words are almost always 'A' or 'I'.",
      "The most common English letters are E, T, A, O, I, N — match them to the most frequent encoded letters.",
      "Look for common short words: THE, AND, FOR, ARE, BUT, NOT.",
      "Apostrophes usually precede S, T, D, M, LL, or RE.",
      "Double letters are often LL, SS, EE, OO, TT, or FF.",
    ],
  },
  {
    icon: Hash,
    title: "Number Fill-In",
    steps: [
      "You are given a list of numbers to place into the grid.",
      "Click a cell and type digits to fill it in.",
      "Each number from the bank must appear exactly once in the grid.",
      "Click a number in the bank to cross it off as you place it.",
    ],
    tips: [
      "Start with numbers that have a unique length — if only one number is 5 digits, there's only one slot it can fit.",
      "Look for distinctive digit patterns (repeated digits, leading zeros are absent).",
      "Cross-reference intersecting slots to narrow down possibilities.",
    ],
  },
  {
    icon: Type,
    title: "Word Fill-In",
    steps: [
      "You are given a list of words to place into the grid.",
      "Click a cell and type letters — the cursor moves automatically.",
      "Each word from the bank must appear exactly once.",
      "Click a word in the bank to cross it off as you place it.",
    ],
    tips: [
      "Start with words that have a unique length — they can only go in one slot.",
      "Use intersecting letters from placed words to eliminate options for crossing slots.",
      "Uncommon letters (Q, Z, X) in a word help pinpoint its position.",
    ],
  },
];

const Help = () => (
  <Layout>
    <div className="container max-w-2xl py-12">
      <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">Help</h1>
      <p className="mt-2 text-muted-foreground">
        Learn how to play each puzzle type, with tips to improve your solving.
      </p>

      <div className="mt-10 space-y-12">
        {sections.map(({ icon: Icon, title, steps, tips }) => (
          <div key={title}>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon size={18} />
              </div>
              <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
            </div>

            <h3 className="mt-4 pl-12 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              How to play
            </h3>
            <ol className="mt-2 space-y-1.5 pl-12">
              {steps.map((step, i) => (
                <li key={i} className="text-sm text-muted-foreground list-decimal leading-relaxed">
                  {step}
                </li>
              ))}
            </ol>

            <h3 className="mt-4 pl-12 text-xs font-semibold uppercase tracking-wider text-primary">
              Tips
            </h3>
            <ul className="mt-2 space-y-1.5 pl-12">
              {tips.map((tip, i) => (
                <li key={i} className="text-sm text-muted-foreground list-disc leading-relaxed">
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  </Layout>
);

export default Help;
