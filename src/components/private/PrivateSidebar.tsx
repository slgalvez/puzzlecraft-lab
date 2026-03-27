import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, MessageSquare, Users, Settings, LogOut, Puzzle, ShieldAlert, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { invokeMessaging, SessionExpiredError } from "@/lib/privateApi";
import { NavLink } from "@/components/NavLink";
import { applyChatTheme } from "@/lib/chatTheme";
import { usePrivateNotifications } from "@/hooks/usePrivateNotifications";
import { useActivityBanner } from "@/hooks/useActivityBanner";
import { ActivityBanner } from "@/components/private/ActivityBanner";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
  useSidebar,
} from "@/components/ui/sidebar";

const adminNav = [
  { title: "Overview", url: "/p", icon: LayoutDashboard, badgeKey: "overview" as const },
  { title: "Conversations", url: "/p/conversations", icon: MessageSquare, badgeKey: "unread" as const },
  { title: "Puzzles for You", url: "/p/for-you", icon: Puzzle, badgeKey: "puzzles" as const },
  { title: "Location", url: "/p/location", icon: MapPin, badgeKey: "location" as const },
  { title: "Users", url: "/p/users", icon: Users },
  { title: "Failed Logins", url: "/p/failed-logins", icon: ShieldAlert },
  { title: "Settings", url: "/p/settings", icon: Settings },
];

const userNav = [
  { title: "Overview", url: "/p", icon: LayoutDashboard, badgeKey: "overview" as const },
  { title: "Conversation", url: "/p/conversation", icon: MessageSquare, badgeKey: "unread" as const },
  { title: "Puzzles for You", url: "/p/for-you", icon: Puzzle, badgeKey: "puzzles" as const },
  { title: "Location", url: "/p/location", icon: MapPin, badgeKey: "location" as const },
  { title: "Settings", url: "/p/settings", icon: Settings },
];

/** Keys for sessionStorage tracking "last seen" timestamps */
const SEEN_KEY_OVERVIEW = "private_seen_overview";
const SEEN_KEY_CONVERSATION = "private_seen_conversation";
const SEEN_KEY_PUZZLES = "private_seen_puzzles";

function getSeenTimestamp(key: string): number {
  const v = sessionStorage.getItem(key);
  return v ? parseInt(v, 10) : 0;
}

function setSeenTimestamp(key: string) {
  sessionStorage.setItem(key, Date.now().toString());
}

export function PrivateSidebar() {
  const { state, open } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token, signOut } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unsolvedPuzzles, setUnsolvedPuzzles] = useState(0);
  const [hasLocationActivity, setHasLocationActivity] = useState(false);
  const [hasOverviewActivity, setHasOverviewActivity] = useState(false);
  const prevPathRef = useRef(location.pathname);
  const { checkUnread, checkIncomingCall } = usePrivateNotifications(token);
  const { currentItem, dismiss, showBanner } = useActivityBanner();

  // Track previous state for detecting new activity
  const prevConvsRef = useRef<Record<string, { unread: number; lastMsg: string; lastMsgAt: string; senderName?: string }>>({});
  const prevPuzzleIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);
  const pollingStoppedRef = useRef(false);

  const isAdmin = user?.role === "admin";
  const navItems = isAdmin ? adminNav : userNav;

  const handleSessionExpired = useCallback(async () => {
    if (pollingStoppedRef.current) return;
    pollingStoppedRef.current = true;
    await signOut();
    navigate("/");
  }, [navigate, signOut]);

  // Re-apply chat theme when sidebar opens (body-level vars ensure portals inherit)
  useEffect(() => {
    if (open) applyChatTheme();
  }, [open]);

  // Mark tabs as "seen" when user navigates to them
  useEffect(() => {
    const path = location.pathname;
    if (path === "/p") {
      setSeenTimestamp(SEEN_KEY_OVERVIEW);
      setHasOverviewActivity(false);
    }
    if (path === "/p/conversation" || path.startsWith("/p/conversations") || path.startsWith("/p/conversation/")) {
      setSeenTimestamp(SEEN_KEY_CONVERSATION);
    }
    if (path === "/p/for-you") {
      setSeenTimestamp(SEEN_KEY_PUZZLES);
    }
    prevPathRef.current = path;
  }, [location.pathname]);

  const fetchCounts = useCallback(async () => {
    if (!token || !user || pollingStoppedRef.current) return;
    try {
      let msgUnread = 0;
      let latestMessageTime = 0;
      let primaryConvId: string | null = null;

      if (isAdmin) {
        const data = await invokeMessaging("list-conversations", token);
        const convs = data.conversations || [];
        if (convs.length > 0) primaryConvId = convs[0].id;
        msgUnread = convs.reduce(
          (sum: number, c: { unread_count: number }) => sum + c.unread_count,
          0
        );

        // Detect new messages per conversation (only from OTHER users)
        // unread_count from backend already excludes messages sent by current user,
        // so c.unread_count > prev.unread only triggers for incoming messages.
        if (!initialLoadRef.current) {
          for (const c of convs) {
            const prev = prevConvsRef.current[c.id];
            if (prev && c.unread_count > prev.unread && c.last_message_at !== prev.lastMsgAt) {
              // Clean preview from system prefixes
              let preview = c.last_message || "";
              if (preview.startsWith("__")) preview = "";
              if (preview.length > 50) preview = preview.slice(0, 47) + "…";

              showBanner({
                type: "message",
                senderName: c.user_name || "Someone",
                preview: preview || "New message",
                navigateTo: `/p/conversations/${c.id}`,
              });
            }
          }
        }

        // Update tracking map
        const newMap: typeof prevConvsRef.current = {};
        for (const c of convs) {
          newMap[c.id] = {
            unread: c.unread_count,
            lastMsg: c.last_message || "",
            lastMsgAt: c.last_message_at || "",
          };
        }
        prevConvsRef.current = newMap;

        for (const c of convs) {
          if (c.last_message_at) {
            const t = new Date(c.last_message_at).getTime();
            if (t > latestMessageTime) latestMessageTime = t;
          }
        }
      } else {
        const data = await invokeMessaging("get-my-conversation", token);
        primaryConvId = data.conversation_id || null;
        msgUnread = data.unread_count || 0;
        const msgs = data.messages || [];

        // Detect new messages for user role (suppress self-notifications)
        if (!initialLoadRef.current && msgs.length > 0) {
          const lastMsg = msgs[msgs.length - 1];
          const prevAny = Object.values(prevConvsRef.current)[0];
          const isSelfMessage = lastMsg.sender_profile_id === user.id;
          if (!isSelfMessage && prevAny && msgUnread > prevAny.unread && lastMsg.created_at !== prevAny.lastMsgAt) {
            let preview = lastMsg.body || "";
            if (preview.startsWith("__")) preview = "";
            if (preview.length > 50) preview = preview.slice(0, 47) + "…";

            showBanner({
              type: "message",
              senderName: data.admin_name || "Someone",
              preview: preview || "New message",
              navigateTo: "/p/conversation",
            });
          }
        }

        prevConvsRef.current = {
          user: {
            unread: msgUnread,
            lastMsg: msgs.length > 0 ? msgs[msgs.length - 1].body : "",
            lastMsgAt: msgs.length > 0 ? msgs[msgs.length - 1].created_at : "",
          },
        };

        if (msgs.length > 0) {
          const t = new Date(msgs[msgs.length - 1].created_at).getTime();
          if (t > latestMessageTime) latestMessageTime = t;
        }
      }

      const puzzleData = await invokeMessaging("list-puzzles", token);
      const allPuzzles = puzzleData.puzzles || [];
      const unsolved = allPuzzles.filter(
        (p: { sent_to: string; solved_by: string | null }) => p.sent_to === user.id && !p.solved_by
      ).length;

      // Detect new puzzles received
      if (!initialLoadRef.current) {
        for (const p of allPuzzles) {
          if (p.sent_to === user.id && !p.solved_by && !prevPuzzleIdsRef.current.has(p.id)) {
            const puzzleTypeLabel = (p.puzzle_type || "puzzle")
              .replace(/-/g, " ")
              .replace(/\b\w/g, (c: string) => c.toUpperCase());
            showBanner({
              type: "puzzle",
              senderName: p.creator_name || "Someone",
              preview: puzzleTypeLabel,
              navigateTo: "/p/for-you",
            });
          }
        }
      }

      // Track known puzzle IDs
      prevPuzzleIdsRef.current = new Set(
        allPuzzles
          .filter((p: { sent_to: string; solved_by: string | null }) => p.sent_to === user.id && !p.solved_by)
          .map((p: { id: string }) => p.id)
      );

      initialLoadRef.current = false;

      setUnreadCount(msgUnread);
      setUnsolvedPuzzles(unsolved);

      // Check for incoming location activity
      if (primaryConvId) {
        try {
          const locData = await invokeMessaging("get-shared-location", token, { conversation_id: primaryConvId });
          setHasLocationActivity(!!locData.incoming);
        } catch {
          // Don't fail the whole poll for location
        }
      } else {
        setHasLocationActivity(false);
      }

      // Only trigger push/browser notifications if user is NOT currently viewing a conversation
      const isInConversation =
        location.pathname === "/p/conversation" ||
        location.pathname.startsWith("/p/conversations/");
      if (!isInConversation) {
        checkUnread(msgUnread);
      } else {
        // Still track count so we don't fire a stale notification later
        checkUnread(0);
      }

      const overviewSeen = getSeenTimestamp(SEEN_KEY_OVERVIEW);
      const isOnOverview = location.pathname === "/p";

      if (!isOnOverview) {
        let hasNew = false;
        if (latestMessageTime > overviewSeen) hasNew = true;
        for (const p of allPuzzles) {
          const createdAt = new Date(p.created_at).getTime();
          const solvedAt = p.solved_at ? new Date(p.solved_at).getTime() : 0;
          if (createdAt > overviewSeen || solvedAt > overviewSeen) {
            hasNew = true;
            break;
          }
        }
        setHasOverviewActivity(hasNew);
      } else {
        setHasOverviewActivity(false);
      }
    } catch (e) {
      if (e instanceof SessionExpiredError) {
        console.debug("[sidebar] session expired — stopping sidebar polling");
        await handleSessionExpired();
      } else {
        console.warn("[sidebar] fetchCounts error", e);
      }
    }
  }, [token, isAdmin, user, location.pathname, checkUnread, showBanner, handleSessionExpired]);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 10000);
    return () => clearInterval(interval);
  }, [fetchCounts]);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <>
      <ActivityBanner item={currentItem} onDismiss={dismiss} />
      <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="pt-4 flex flex-col h-full">
        <div className="px-4 pb-4">
          {!collapsed && (
            <span className="text-sm font-semibold tracking-tight text-foreground">
              The Lab
            </span>
          )}
        </div>
        <SidebarGroup className="flex-1">
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/p"}
                      className="hover:bg-sidebar-accent/60"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <div className="relative mr-2 shrink-0">
                        <item.icon className="h-4 w-4" />
                        {/* Overview dot */}
                        {"badgeKey" in item && item.badgeKey === "overview" && hasOverviewActivity && (
                          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive ring-1 ring-sidebar" />
                        )}
                        {/* Conversation dot (shown on icon when collapsed) */}
                        {"badgeKey" in item && item.badgeKey === "unread" && unreadCount > 0 && collapsed && (
                          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive ring-1 ring-sidebar" />
                        )}
                        {/* Puzzles dot (shown on icon when collapsed) */}
                        {"badgeKey" in item && item.badgeKey === "puzzles" && unsolvedPuzzles > 0 && collapsed && (
                          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive ring-1 ring-sidebar" />
                        )}
                      </div>
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                  {/* Conversation: dot indicator */}
                  {"badgeKey" in item && item.badgeKey === "unread" && unreadCount > 0 && !collapsed && (
                    <SidebarMenuBadge>
                      <span className="h-2 w-2 rounded-full bg-destructive" />
                    </SidebarMenuBadge>
                  )}
                  {/* Puzzles: count badge */}
                  {"badgeKey" in item && item.badgeKey === "puzzles" && unsolvedPuzzles > 0 && !collapsed && (
                    <SidebarMenuBadge className="bg-destructive text-destructive-foreground text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full">
                      {unsolvedPuzzles}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <div className="p-3 border-t border-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-2 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 rounded-md transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Log out</span>}
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
    </>
  );
}
