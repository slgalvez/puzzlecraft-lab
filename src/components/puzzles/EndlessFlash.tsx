import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** A quick checkmark flash shown between endless puzzles. */
const EndlessFlash = ({ onDone }: { onDone: () => void }) => {
  const [phase, setPhase] = useState<"in" | "out">("in");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("out"), 600);
    const t2 = setTimeout(() => onDone(), 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center pointer-events-none transition-opacity duration-300",
        phase === "in" ? "opacity-100" : "opacity-0"
      )}
    >
      <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center animate-scale-in">
        <Check size={32} className="text-primary" strokeWidth={3} />
      </div>
    </div>
  );
};

export default EndlessFlash;
