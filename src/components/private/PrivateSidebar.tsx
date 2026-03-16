import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, MessageSquare, Users, Settings, LogOut, Gift } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { invokeMessaging } from "@/lib/privateApi";
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
  { title: "Overview", url: "/p", icon: LayoutDashboard },
  { title: "Conversations", url: "/p/conversations", icon: MessageSquare, badgeKey: "unread" as const },
  { title: "For You", url: "/p/for-you", icon: Gift, badgeKey: "puzzles" as const },
  { title: "Users", url: "/p/users", icon: Users },
  { title: "Settings", url: "/p/settings", icon: Settings },
];

const userNav = [
  { title: "Overview", url: "/p", icon: LayoutDashboard },
  { title: "Conversation", url: "/p/conversation", icon: MessageSquare, badgeKey: "unread" as const },
  { title: "For You", url: "/p/for-you", icon: Gift, badgeKey: "puzzles" as const },
  { title: "Settings", url: "/p/settings", icon: Settings },
];

export function PrivateSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token, signOut } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unsolvedPuzzles, setUnsolvedPuzzles] = useState(0);

  const isAdmin = user?.role === "admin";
  const navItems = isAdmin ? adminNav : userNav;

  const fetchCounts = useCallback(async () => {
    if (!token) return;
    try {
      // Fetch unread messages
      if (isAdmin) {
        const data = await invokeMessaging("list-conversations", token);
        const total = (data.conversations || []).reduce(
          (sum: number, c: { unread_count: number }) => sum + c.unread_count,
          0
        );
        setUnreadCount(total);
      } else {
        const data = await invokeMessaging("get-my-conversation", token);
        setUnreadCount(data.unread_count || 0);
      }

      // Fetch unsolved puzzles
      const puzzleData = await invokeMessaging("list-puzzles", token);
      const unsolved = (puzzleData.puzzles || []).filter(
        (p: { sent_to: string; solved_by: string | null }) => p.sent_to === user?.id && !p.solved_by
      ).length;
      setUnsolvedPuzzles(unsolved);
    } catch {
      // silent
    }
  }, [token, isAdmin, user?.id]);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 10000);
    return () => clearInterval(interval);
  }, [fetchCounts]);

  const isActive = (path: string) => {
    if (path === "/p") return location.pathname === "/p";
    return location.pathname.startsWith(path);
  };

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
              Workspace
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
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                  {"badgeKey" in item && item.badgeKey === "unread" && unreadCount > 0 && (
                    <SidebarMenuBadge className="bg-primary text-primary-foreground text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full">
                      {unreadCount}
                    </SidebarMenuBadge>
                  )}
                  {"badgeKey" in item && item.badgeKey === "puzzles" && unsolvedPuzzles > 0 && (
                    <SidebarMenuBadge className="bg-primary text-primary-foreground text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full">
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
