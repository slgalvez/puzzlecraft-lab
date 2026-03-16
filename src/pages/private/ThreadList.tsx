import { Link } from "react-router-dom";
import PrivateLayout from "@/components/private/PrivateLayout";

const placeholderThreads = [
  { id: "1", title: "Thread #1", preview: "No content yet", time: "—", unread: false },
  { id: "2", title: "Thread #2", preview: "No content yet", time: "—", unread: false },
  { id: "3", title: "Thread #3", preview: "No content yet", time: "—", unread: false },
];

const ThreadList = () => {
  return (
    <PrivateLayout title="Threads">
      <div className="p-6">
        <div className="rounded-lg border border-border bg-card divide-y divide-border">
          {placeholderThreads.map((thread) => (
            <Link
              key={thread.id}
              to={`/p/threads/${thread.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-secondary/40 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {thread.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground truncate">
                  {thread.preview}
                </p>
              </div>
              <span className="ml-4 text-xs text-muted-foreground shrink-0">
                {thread.time}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </PrivateLayout>
  );
};

export default ThreadList;
