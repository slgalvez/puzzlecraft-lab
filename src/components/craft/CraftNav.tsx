import { cn } from "@/lib/utils";

export type CraftView = "create" | "inbox";

interface CraftNavProps {
  view: CraftView;
  onViewChange: (v: CraftView) => void;
  /** Number of received puzzles not yet started — drives the badge */
  unreadCount: number;
}

export default function CraftNav({ view, onViewChange, unreadCount }: CraftNavProps) {
  return (
    <div className="flex justify-center mb-5">
      <div className="inline-flex rounded-full border border-border bg-muted/40 p-0.5">
        <button
          onClick={() => onViewChange("create")}
          className={cn(
            "px-5 py-1.5 rounded-full text-xs font-medium transition-colors",
            view === "create"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground",
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
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Inbox
          {/* Badge: unread RECEIVED items only — not drafts */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
