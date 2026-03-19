import PuzzleIcon from "@/components/puzzles/PuzzleIcon";
import type { PuzzleCategory } from "@/lib/puzzleTypes";

type CraftType = "word-fill" | "cryptogram" | "crossword" | "word-search";

const TYPE_OPTIONS: { value: CraftType; label: string; description: string; iconType: PuzzleCategory }[] = [
  { value: "word-search", label: "Word Search", description: "Hide words and reveal a message", iconType: "word-search" },
  { value: "word-fill", label: "Word Fill-In", description: "Create a puzzle from your own words", iconType: "word-fill" },
  { value: "crossword", label: "Crossword", description: "Write clues and challenge someone", iconType: "crossword" },
  { value: "cryptogram", label: "Cryptogram", description: "Turn your message into a coded puzzle", iconType: "cryptogram" },
];

export { TYPE_OPTIONS };

export default function CraftTypeCards({ onSelect }: { onSelect: (type: CraftType) => void }) {
  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      <p className="text-xs text-muted-foreground mb-4">Choose puzzle type</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TYPE_OPTIONS.map((opt, i) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className="group relative p-6 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 text-left"
            style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors duration-200 group-hover:bg-primary/15">
                <PuzzleIcon type={opt.iconType} size={18} />
              </div>
              <div className="space-y-1 min-w-0">
                <span className="block text-[15px] font-medium text-foreground">{opt.label}</span>
                <p className="text-xs text-muted-foreground leading-relaxed">{opt.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
