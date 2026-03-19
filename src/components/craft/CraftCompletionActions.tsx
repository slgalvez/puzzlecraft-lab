import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface CraftCompletionActionsProps {
  /** The "from" field of the solved puzzle — used to pre-fill "For {sender}" */
  senderName?: string;
  /** The puzzle type that was just solved */
  puzzleType?: string;
}

export default function CraftCompletionActions({ senderName, puzzleType }: CraftCompletionActionsProps) {
  const navigate = useNavigate();

  const handleSendBack = () => {
    const prefillTitle = senderName ? `For ${senderName}` : "";
    navigate("/craft", { state: { prefillTitle, startAtContent: true } });
  };

  const handleCreateOwn = () => {
    navigate("/craft");
  };

  const handlePlayAnother = () => {
    if (puzzleType) {
      navigate(`/quick-play/${puzzleType}`);
    } else {
      navigate("/puzzles");
    }
  };

  return (
    <div className="mt-8 space-y-2.5 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <Button onClick={handleSendBack} className="w-full">
        Send one back
      </Button>
      <button
        onClick={handleCreateOwn}
        className="w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
      >
        Create your own
      </button>
      <button
        onClick={handlePlayAnother}
        className="w-full text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors py-1.5"
      >
        Play another puzzle
      </button>
    </div>
  );
}
