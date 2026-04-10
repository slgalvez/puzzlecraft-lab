/**
 * IOSTabBar.tsx
 * src/components/IOSTabBar.tsx
 *
 * Native-feeling bottom tab bar for iOS / Capacitor.
 *
 * Features:
 *   • Spring scale animation on active tab press (CSS keyframe)
 *   • Safe-area inset handling for iPhone home indicator
 *   • Touch-manipulation on all tap targets
 *   • Badge support (e.g. pending craft inbox items)
 *   • Identical navigation parity with desktop sidebar
 *   • Haptic feedback hint (iOS will handle via Capacitor Haptics)
 */

import { Link, useLocation } from "react-router-dom";
import {
  LayoutGrid, Sun, Wrench, BarChart3, User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface TabItem {
  path: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

const TABS: TabItem[] = [
  { path: "/",        label: "Play",   icon: LayoutGrid },
  { path: "/daily",  label: "Daily",  icon: Sun        },
  { path: "/craft",  label: "Craft",  icon: Wrench     },
  { path: "/stats",  label: "Stats",  icon: BarChart3  },
  { path: "/account",label: "Me",     icon: User       },
];

interface IOSTabBarProps {
  /** Optional badge counts keyed by path. E.g. { "/craft": 3 } */
  badges?: Partial<Record<string, number>>;
}

const IOSTabBar = ({ badges = {} }: IOSTabBarProps) => {
  const location = useLocation();
  const [pressedTab, setPressedTab] = useState<string | null>(null);

  // Animate pressed tab — resets after spring duration
  const handlePress = (path: string) => {
    setPressedTab(path);
    // Light haptic via Capacitor (no-ops gracefully on web)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any)?.Capacitor?.Plugins?.Haptics?.impact?.({ style: "light" });
    } catch {
      /* noop */
    }
  };

  useEffect(() => {
    if (!pressedTab) return;
    const t = setTimeout(() => setPressedTab(null), 300);
    return () => clearTimeout(t);
  }, [pressedTab]);

  // Determine active tab — root "/" only matches exactly
  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Spacer so page content doesn't hide behind the tab bar */}
      <div className="h-[calc(64px+env(safe-area-inset-bottom))] shrink-0" aria-hidden />

      <nav
        className={cn(
          "fixed bottom-0 inset-x-0 z-50",
          "border-t border-border/60 bg-background/95 backdrop-blur-xl",
          // Safe area padding for iPhone home indicator
          "pb-[env(safe-area-inset-bottom)]",
        )}
        role="tablist"
        aria-label="Main navigation"
      >
        <div className="flex items-stretch h-16">
          {TABS.map(({ path, label, icon: Icon, badge: staticBadge }) => {
            const active = isActive(path);
            const badgeCount = badges[path] ?? staticBadge ?? 0;
            const pressed = pressedTab === path;

            return (
              <Link
                key={path}
                to={path}
                role="tab"
                aria-selected={active}
                aria-label={label}
                onPointerDown={() => handlePress(path)}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 py-2",
                  "touch-manipulation select-none",
                  "transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {/* Icon wrapper — spring scale on press */}
                <div
                  className={cn(
                    "relative flex items-center justify-center w-7 h-7",
                    pressed && "animate-tab-spring",
                    active && !pressed && "scale-110 transition-transform duration-200",
                  )}
                >
                  <Icon
                    size={active ? 22 : 20}
                    strokeWidth={active ? 2.2 : 1.8}
                    className="transition-all duration-200"
                  />

                  {/* Badge */}
                  {badgeCount > 0 && (
                    <span
                      className={cn(
                        "absolute -top-1 -right-1",
                        "min-w-[16px] h-4 px-1 rounded-full",
                        "bg-destructive text-destructive-foreground",
                        "text-[9px] font-bold leading-4 text-center",
                      )}
                    >
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span
                  className={cn(
                    "text-[10px] font-medium leading-none transition-all duration-200",
                    active ? "font-semibold opacity-100" : "opacity-60",
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default IOSTabBar;
