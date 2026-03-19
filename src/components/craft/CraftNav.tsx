import { cn } from "@/lib/utils";

export type CraftView = "create" | "inbox";

interface CraftNavProps {
  view: CraftView;
  onViewChange: (v: CraftView) => void;
  draftCount: number;
}

export default function CraftNav({ view, onViewChange, draftCount }: CraftNavProps) {
  return (
    <div className="flex justify-center mb-5">
      <div className="inline-flex rounded-full border border-border bg-muted/40 p-0.5">
        <button
          onClick={() => onViewChange("create")}
          className={cn(
            "px-5 py-1.5 rounded-full text-xs font-medium transition-colors",
            view === "create"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Create
        </button>
        <button
          onClick={() => onViewChange("inbox")}
          className={cn(
            "px-5 py-1.5 rounded-full text-xs font-medium transition-colors relative",
            view === "inbox"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Inbox
          {draftCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
              {draftCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
