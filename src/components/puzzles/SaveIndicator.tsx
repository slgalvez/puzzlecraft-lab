import { cn } from "@/lib/utils";

interface Props {
  status: "idle" | "saving" | "saved";
}

/** Tiny inline save indicator — only visible when saving/saved */
const SaveIndicator = ({ status }: Props) => {
  if (status === "idle") return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-medium transition-opacity duration-300",
        status === "saving" && "text-muted-foreground/60 animate-pulse",
        status === "saved" && "text-muted-foreground/50"
      )}
    >
      {status === "saving" ? "Saving…" : "Saved"}
    </span>
  );
};

export default SaveIndicator;
