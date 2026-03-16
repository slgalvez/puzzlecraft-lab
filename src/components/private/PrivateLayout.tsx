import { useEffect, useRef, useCallback } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PrivateSidebar } from "@/components/private/PrivateSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogOut, Puzzle } from "lucide-react";

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
    // Clear visual state without logging out
    sessionStorage.removeItem("private_view_state");
    navigate("/");
  }, [navigate]);

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
            <header className="h-14 flex items-center justify-between border-b border-border px-4 shrink-0">
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
