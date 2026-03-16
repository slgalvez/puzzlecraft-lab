import { useLocation } from "react-router-dom";
import { LayoutDashboard, MessageSquare, Users, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const adminNav = [
  { title: "Overview", url: "/p", icon: LayoutDashboard },
  { title: "Users", url: "/p/users", icon: Users },
  { title: "Settings", url: "/p/settings", icon: Settings },
];

const userNav = [
  { title: "Conversation", url: "/p/conversation", icon: MessageSquare },
  { title: "Settings", url: "/p/settings", icon: Settings },
];

export function PrivateSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user } = useAuth();

  const navItems = user?.role === "admin" ? adminNav : userNav;

  const isActive = (path: string) => {
    if (path === "/p") return location.pathname === "/p";
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="pt-4">
        <div className="px-4 pb-4">
          {!collapsed && (
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Workspace
            </span>
          )}
        </div>
        <SidebarGroup>
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
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
