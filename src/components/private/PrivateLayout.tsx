import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PrivateSidebar } from "@/components/private/PrivateSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

interface PrivateLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function PrivateLayout({ children, title }: PrivateLayoutProps) {
  const { signOut, user } = useAuth();

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
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {user?.first_name} {user?.last_name}
                </span>
                <button
                  onClick={() => signOut()}
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
