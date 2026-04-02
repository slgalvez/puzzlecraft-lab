import { useEffect, useRef, useCallback } from "react";
import { getFocusLossEnabled } from "@/lib/focusLossSettings";
import { isCallActive, clearCallSetupGrace } from "@/lib/callActive";
import { clearPrivateAccessGrant } from "@/lib/privateAccessGrant";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PrivateSidebar } from "@/components/private/PrivateSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut, Puzzle } from "lucide-react";
import { applyChatTheme } from "@/lib/chatTheme";
import { useGlobalIncomingCall } from "@/hooks/useGlobalIncomingCall";
import { IncomingCallBanner } from "@/components/private/IncomingCallBanner";
import { VideoCallPIP } from "@/components/private/VideoCallPIP";

const LAST_ACTIVE_KEY = "private_last_active";
const GRACE_PERIOD_MS = 5 * 60 * 1000; // 5 minutes

function stampActive() {
  localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
}

interface PrivateLayoutProps {
  children: React.ReactNode;
  title?: string;
  /** When true, main area uses flex column with no overflow (for chat views) */
  fullHeight?: boolean;
}

export default function PrivateLayout({ children, title, fullHeight }: PrivateLayoutProps) {
  const { signOut, user, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const escCountRef = useRef(0);
  const escTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSessionExpired = useCallback(() => {
    signOut();
    navigate("/");
  }, [signOut, navigate]);

  // Global incoming call detection (shows banner on ALL Secret Lab pages)
  const isOnConversationPage =
    location.pathname.startsWith("/p/conversation") ||
    location.pathname.startsWith("/p/conversations");
  const globalCall = useGlobalIncomingCall(
    isOnConversationPage ? null : token, // Don't poll globally when already in a conversation (that page has its own polling)
    handleSessionExpired,
  );

  const handleAcceptGlobalCall = useCallback((callId: string) => {
    const convId = globalCall.incomingCall?.conversationId;
    globalCall.acceptCall(callId);
    // Navigate to the conversation so the user can handle the call
    if (convId) {
      if (user?.role === "admin") {
        navigate(`/p/conversations/${convId}`);
      } else {
        navigate("/p/conversation");
      }
    }
  }, [globalCall, user, navigate]);

  const quickExit = useCallback(() => {
    sessionStorage.removeItem("private_view_state");
    clearPrivateAccessGrant();
    clearCallSetupGrace();
    stampActive();
    navigate("/");
  }, [navigate]);

  // Apply chat theme on mount
  useEffect(() => {
    applyChatTheme();
  }, []);

  // Focus-loss privacy protection
  useEffect(() => {
    let armed = false;
    const armTimer = setTimeout(() => { armed = true; }, 1500);

    const shouldIgnoreExit = () => {
      if (!armed) return true;
      if (!getFocusLossEnabled()) return true;
      if (isCallActive()) return true; // Ignore app-switch / permission sheet during call setup or active call
      return false;
    };

    const handleVisibilityChange = () => {
      if (shouldIgnoreExit()) return;
      if (document.visibilityState === "hidden") {
        quickExit();
      }
    };

    const handlePageHide = (event: PageTransitionEvent) => {
      if (shouldIgnoreExit()) return;
      if (event.persisted) return; // Ignore bfcache-style page transitions
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

  // Grace period check
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

  // Escape × 2 shortcut
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
      {/* PIP overlay for active calls */}
      <VideoCallPIP />
      {/* Global incoming call banner — visible on ALL Secret Lab pages */}
      {globalCall.incomingCall && !isOnConversationPage && (
        <IncomingCallBanner
          call={{
            callId: globalCall.incomingCall.callId,
            callerName: globalCall.incomingCall.callerName,
            callerProfileId: globalCall.incomingCall.callerProfileId,
          }}
          onAccept={handleAcceptGlobalCall}
          onDecline={globalCall.declineCall}
        />
      )}
      <SidebarProvider className="h-full min-h-0">
        <div className="flex h-full min-h-0 w-full overflow-hidden">
          <PrivateSidebar />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <header className="pwa-safe-top flex items-center justify-between border-b border-primary/20 px-4 shrink-0" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', minHeight: 'calc(3.5rem + env(safe-area-inset-top, 0px))' }}>
              <div className="flex items-center gap-3">
                <SidebarTrigger className="text-primary" />
                {title && (
                  <h1 className="text-base font-semibold text-primary tracking-tight">
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
            {fullHeight ? (
              <main className="min-h-0 flex-1 flex flex-col overflow-hidden">{children}</main>
            ) : (
              <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
            )}
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
}
