import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Dices, Palette, BarChart3, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadReceivedItems } from "@/lib/craftHistory";
import { hapticLight } from "@/lib/haptic";

// ── Tab definitions ────────────────────────────────────────────────────────
// RESTORED: 4 tabs only. "Daily" tab was incorrectly added during the audit.
// Daily puzzle is accessible from the Play tab and not a top-level nav item.

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

  // Poll for new received craft puzzles every 30s and on focus
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

  // Re-check badge when navigating away from Craft
  useEffect(() => {
    setUnreadCraft(getUnreadCraftCount());
  }, [location.pathname]);

  const activeTab =
    tabs.find((t) =>
      t.paths.some((p) =>
        p === "/" ? location.pathname === "/" : location.pathname.startsWith(p)
      )
    )?.key ?? "play";

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

          return (
            <button
              key={key}
              onClick={() => handleTab(key)}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-5 py-1.5 min-h-[44px] transition-all duration-150",
                "active:scale-90",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              {/* Icon with scale on active */}
              <div
                className={cn(
                  "relative transition-transform duration-200",
                  active ? "scale-110" : "scale-100"
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
                  "text-[10px] font-medium transition-all duration-200",
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
