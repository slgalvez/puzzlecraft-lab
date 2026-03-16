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
  // Only triggers on visibilitychange (tab/app switch), NOT window blur,
  // so banner notifications and overlays don't kick the user out.
  useEffect(() => {
    let armed = false;
    const armTimer = setTimeout(() => { armed = true; }, 30_000);

    const handleVisibilityChange = () => {
      if (armed && getFocusLossEnabled() && document.visibilityState === "hidden") {
        quickExit();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    stampActive();
    const interval = setInterval(stampActive, 10_000);

    return () => {
      clearTimeout(armTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
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
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <PrivateSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="flex items-center justify-between border-b border-border px-4 shrink-0 pt-[env(safe-area-inset-top,0px)]" style={{ minHeight: 'calc(3.5rem + env(safe-area-inset-top, 0px))' }}>
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                {title && (
                  <h1 className="text-base font-semibold text-foreground tracking-tight">
                    {title}
                  </h1>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={quickExit}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  title="Back to Puzzles"
                >
                  <Puzzle size={14} />
                  <span className="hidden sm:inline">Puzzles</span>
                </button>
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {user?.first_name} {user?.last_name}
                </span>
                <button
                  onClick={() => { signOut(); navigate("/"); }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </header>
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
}
