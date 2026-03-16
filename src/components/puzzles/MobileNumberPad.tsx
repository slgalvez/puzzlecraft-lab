import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptic";

interface Props {
  onNumber: (n: number) => void;
  onDelete: () => void;
  visible: boolean;
  maxDigit?: number;
}

const MobileNumberPad = ({ onNumber, onDelete, visible, maxDigit = 9 }: Props) => {
  if (!visible) return null;

  return (
    <div className="grid grid-cols-5 gap-1.5 mt-3 sm:hidden max-w-[280px]">
      {Array.from({ length: maxDigit }, (_, i) => (
        <button
          key={i + 1}
          type="button"
          className={cn(
            "h-11 rounded-lg border border-border bg-card text-foreground font-semibold text-lg",
            "active:bg-puzzle-cell-active active:scale-95 transition-all touch-manipulation"
          )}
          onClick={() => { haptic(); onNumber(i + 1); }}
        >
          {i + 1}
        </button>
      ))}
      <button
        type="button"
        className={cn(
          "h-11 rounded-lg border border-border bg-card text-muted-foreground font-semibold text-sm",
          "active:bg-destructive/10 active:scale-95 transition-all touch-manipulation"
        )}
        onClick={onDelete}
      >
        ⌫
      </button>
    </div>
  );
};

export default MobileNumberPad;
