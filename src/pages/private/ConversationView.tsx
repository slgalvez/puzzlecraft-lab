import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import PrivateLayout from "@/components/private/PrivateLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const ConversationView = () => {
  const { threadId } = useParams<{ threadId: string }>();

  return (
    <PrivateLayout title={`Thread #${threadId}`}>
      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        {/* Top bar */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-3 shrink-0">
          <Link
            to="/p/threads"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <span className="text-sm font-medium text-foreground">
            Thread #{threadId}
          </span>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-auto p-5">
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">
              No content yet. This conversation is empty.
            </p>
          </div>
        </div>

        {/* Compose bar */}
        <div className="border-t border-border px-5 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Type a response..."
              className="flex-1 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              disabled
            />
            <Button size="sm" disabled>
              Send
            </Button>
          </div>
        </div>
      </div>
    </PrivateLayout>
  );
};

export default ConversationView;
