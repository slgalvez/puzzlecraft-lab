import { useLocation, useNavigate } from "react-router-dom";
import { Dices, Palette, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "play", label: "Play", icon: Dices, paths: ["/", "/puzzles", "/daily", "/surprise"] },
  { key: "craft", label: "Craft", icon: Palette, paths: ["/craft"] },
  { key: "stats", label: "Stats", icon: BarChart3, paths: ["/stats", "/leaderboard"] },
] as const;

const IOSTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = tabs.find((t) =>
    t.paths.some((p) =>
      p === "/" ? location.pathname === "/" : location.pathname.startsWith(p)
    )
  )?.key ?? "play";

  const handleTab = (key: string) => {
    switch (key) {
      case "play":
        navigate("/");
        break;
      case "craft":
        navigate("/craft");
        break;
      case "stats":
        navigate("/stats");
        break;
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-surface-elevated/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around h-14">
        {tabs.map(({ key, label, icon: Icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => handleTab(key)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-4 py-1.5 transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default IOSTabBar;
