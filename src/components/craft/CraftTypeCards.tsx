type CraftType = "word-fill" | "cryptogram" | "crossword" | "word-search";

const TYPE_OPTIONS: { value: CraftType; label: string; description: string }[] = [
  { value: "word-search", label: "Word Search", description: "Hide words and reveal a message" },
  { value: "word-fill", label: "Word Fill-In", description: "Create a puzzle from your own words" },
  { value: "crossword", label: "Crossword", description: "Write clues and challenge someone" },
  { value: "cryptogram", label: "Cryptogram", description: "Turn your message into a coded puzzle" },
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
            className="group relative p-6 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/[0.03] hover:shadow-sm transition-all duration-200 text-left hover:scale-[1.01]"
            style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}
          >
            <div className="space-y-1.5">
              <span className="block text-[15px] font-medium text-foreground">{opt.label}</span>
              <p className="text-xs text-muted-foreground leading-relaxed">{opt.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
