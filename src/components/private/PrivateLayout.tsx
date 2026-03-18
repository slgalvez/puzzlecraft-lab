import { useEffect, useRef, useCallback } from "react";
import { getFocusLossEnabled } from "@/lib/focusLossSettings";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PrivateSidebar } from "@/components/private/PrivateSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogOut, Puzzle } from "lucide-react";

const LAST_ACTIVE_KEY = "private_last_active";
const GRACE_PERIOD_MS = 5 * 60 * 1000; // 5 minutes

/** Record that the private app is currently active */
function stampActive() {
  localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
}

interface PrivateLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function PrivateLayout({ children, title }: PrivateLayoutProps) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const escCountRef = useRef(0);
  const escTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const quickExit = useCallback(() => {
    sessionStorage.removeItem("private_view_state");
    sessionStorage.removeItem("private_access_grant");
    stampActive(); // record when we left
    navigate("/");
  }, [navigate]);

  // Focus-loss privacy protection
  // Triggers on: visibilitychange (document.hidden) AND pagehide
  // visibilitychange fires on: tab switch, app switch, phone lock, device sleep, PWA background
  // pagehide fires on: page unload, navigation away, some mobile app-switch scenarios
  // Does NOT trigger on: notification banners, quick-reply overlays, small system UI
  // (these do not set document.visibilityState to "hidden")
  useEffect(() => {
    // Short stabilization window (1.5s) to prevent exit during initial render/hydration.
    // This is NOT a login guard — login is on a separate page that doesn't use PrivateLayout.
    let armed = false;
    const armTimer = setTimeout(() => { armed = true; }, 1500);

    const handleVisibilityChange = () => {
      if (!armed) return;
      if (!getFocusLossEnabled()) return;
      if (document.visibilityState === "hidden") {
        quickExit();
      }
    };

    const handlePageHide = () => {
      if (!armed) return;
      if (!getFocusLossEnabled()) return;
      quickExit();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    stampActive();
    const interval = setInterval(stampActive, 10_000);

    return () => {
      clearTimeout(armTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      clearInterval(interval);
    };
  }, [quickExit]);

  // Check grace period on mount — if > 5 min away, force full logout
  useEffect(() => {
    const lastActive = localStorage.getItem(LAST_ACTIVE_KEY);
    if (lastActive) {
      const elapsed = Date.now() - Number(lastActive);
      if (elapsed > GRACE_PERIOD_MS) {
        signOut();
        navigate("/");
      }
    }
  }, [signOut, navigate]);

  // Escape × 2 keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") {
        escCountRef.current = 0;
        return;
      }
      escCountRef.current++;
      clearTimeout(escTimerRef.current);
      if (escCountRef.current >= 2) {
        escCountRef.current = 0;
        quickExit();
      } else {
        escTimerRef.current = setTimeout(() => {
          escCountRef.current = 0;
        }, 500);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(escTimerRef.current);
    };
  }, [quickExit]);

  return (
    <div className="private-app">
      <SidebarProvider className="h-full min-h-0">
        <div className="flex h-full min-h-0 w-full overflow-hidden">
          <PrivateSidebar />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <header className="pwa-safe-top flex items-center justify-between border-b border-border px-4 shrink-0" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', minHeight: 'calc(3.5rem + env(safe-area-inset-top, 0px))' }}>
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                {title && (
                  <h1 className="text-base font-semibold text-foreground tracking-tight">
                    {title}
                  </h1>
                )}
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={quickExit}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 -mr-1 rounded-md hover:bg-secondary/60 active:bg-secondary"
                  title="Back to Puzzles"
                >
                  <Puzzle size={16} />
                  <span className="hidden sm:inline">Puzzles</span>
                </button>
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {user?.first_name} {user?.last_name}
                </span>
                <button
                  onClick={() => { signOut(); navigate("/"); }}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-secondary/60 active:bg-secondary"
                  title="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </header>
            <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
}