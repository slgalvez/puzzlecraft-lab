import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Dices, Palette, BarChart3, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadReceivedItems } from "@/lib/craftHistory";
import { hapticLight } from "@/lib/haptic";

// ── Tab definitions ────────────────────────────────────────────────────────

const tabs = [
  {
    key: "play",
    label: "Play",
    icon: Dices,
    paths: ["/", "/puzzles", "/daily", "/surprise", "/quick-play"],
  },
  {
    key: "craft",
    label: "Create",
    icon: Palette,
    paths: ["/craft"],
  },
  {
    key: "stats",
    label: "Stats",
    icon: BarChart3,
    paths: ["/stats", "/leaderboard"],
  },
  {
    key: "account",
    label: "Account",
    icon: UserCircle,
    paths: ["/account"],
  },
] as const;

type TabKey = (typeof tabs)[number]["key"];

// ── Badge helpers ──────────────────────────────────────────────────────────

function getUnreadCraftCount(): number {
  try {
    return loadReceivedItems().filter((r) => r.status === "not_started").length;
  } catch {
    return 0;
  }
}

// ── Component ──────────────────────────────────────────────────────────────

const IOSTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCraft, setUnreadCraft] = useState(0);

  // Track which tab just became active so we can play its spring animation once
  const [springKey, setSpringKey] = useState<TabKey | null>(null);
  const prevActive = useRef<TabKey | null>(null);

  // Poll for unread craft puzzles
  useEffect(() => {
    const refresh = () => setUnreadCraft(getUnreadCraftCount());
    refresh();
    const interval = setInterval(refresh, 30_000);
    const handleFocus = () => refresh();
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, []);

  useEffect(() => {
    setUnreadCraft(getUnreadCraftCount());
  }, [location.pathname]);

  const activeTab =
    tabs.find((t) =>
      t.paths.some((p) =>
        p === "/" ? location.pathname === "/" : location.pathname.startsWith(p)
      )
    )?.key ?? "play";

  // Fire spring animation whenever the active tab changes
  useEffect(() => {
    if (prevActive.current !== activeTab) {
      setSpringKey(activeTab);
      prevActive.current = activeTab;
      // Clear after animation completes so it doesn't loop
      const t = setTimeout(() => setSpringKey(null), 400);
      return () => clearTimeout(t);
    }
  }, [activeTab]);

  const handleTab = (key: TabKey) => {
    hapticLight();
    switch (key) {
      case "play":    navigate("/");        break;
      case "craft":   navigate("/craft");   break;
      case "stats":   navigate("/stats");   break;
      case "account": navigate("/account"); break;
    }
  };

  const badges: Partial<Record<TabKey, number>> = {
    craft: unreadCraft,
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around h-14">
        {tabs.map(({ key, label, icon: Icon }) => {
          const active = activeTab === key;
          const badge = badges[key] ?? 0;
          const isSpringTarget = springKey === key;

          return (
            <button
              key={key}
              onClick={() => handleTab(key)}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-5 py-1.5",
                "transition-colors duration-150",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              {/* Icon — spring animation on activation, static scale otherwise */}
              <div
                className={cn(
                  "relative",
                  // Spring animation plays once when this tab becomes active
                  isSpringTarget && "tab-icon-spring",
                  // Static scale for non-animating active state (after spring settles)
                  !isSpringTarget && active && "scale-110",
                  !isSpringTarget && !active && "scale-100",
                )}
              >
                <Icon size={22} strokeWidth={active ? 2.2 : 1.7} />

                {/* Badge dot */}
                {badge > 0 && (
                  <span
                    className={cn(
                      "absolute -top-1.5 -right-1.5 flex items-center justify-center",
                      "rounded-full bg-primary text-primary-foreground font-bold",
                      "min-w-[14px] h-[14px] px-[3px]",
                      "text-[8px] leading-none",
                      "ring-2 ring-background",
                    )}
                  >
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-[10px] font-medium transition-opacity duration-150",
                  active ? "opacity-100" : "opacity-60",
                )}
              >
                {label}
              </span>

              {/* Active indicator dot */}
              {active && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default IOSTabBar;
