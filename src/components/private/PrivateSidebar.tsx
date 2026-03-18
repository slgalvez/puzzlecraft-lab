import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, MessageSquare, Users, Settings, LogOut, Puzzle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { invokeMessaging, SessionExpiredError } from "@/lib/privateApi";
import { NavLink } from "@/components/NavLink";
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
  { title: "Users", url: "/p/users", icon: Users },
  { title: "Settings", url: "/p/settings", icon: Settings },
];

const userNav = [
  { title: "Overview", url: "/p", icon: LayoutDashboard, badgeKey: "overview" as const },
  { title: "Conversation", url: "/p/conversation", icon: MessageSquare, badgeKey: "unread" as const },
  { title: "Puzzles for You", url: "/p/for-you", icon: Puzzle, badgeKey: "puzzles" as const },
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
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token, signOut } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unsolvedPuzzles, setUnsolvedPuzzles] = useState(0);
  const [hasOverviewActivity, setHasOverviewActivity] = useState(false);
  const prevPathRef = useRef(location.pathname);

  const isAdmin = user?.role === "admin";
  const navItems = isAdmin ? adminNav : userNav;

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
    if (!token || !user) return;
    try {
      let msgUnread = 0;
      let latestMessageTime = 0;

      if (isAdmin) {
        const data = await invokeMessaging("list-conversations", token);
        const convs = data.conversations || [];
        msgUnread = convs.reduce(
          (sum: number, c: { unread_count: number }) => sum + c.unread_count,
          0
        );
        for (const c of convs) {
          if (c.last_message_at) {
            const t = new Date(c.last_message_at).getTime();
            if (t > latestMessageTime) latestMessageTime = t;
          }
        }
      } else {
        const data = await invokeMessaging("get-my-conversation", token);
        msgUnread = data.unread_count || 0;
        const msgs = data.messages || [];
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

      setUnreadCount(msgUnread);
      setUnsolvedPuzzles(unsolved);

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
      // On session expiry, sign out and redirect home
      if (e instanceof (await import("@/lib/privateApi")).SessionExpiredError) {
        signOut();
        navigate("/");
      }
      // Other errors: silent
    }
  }, [token, isAdmin, user, location.pathname, signOut, navigate]);

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
  );
}
