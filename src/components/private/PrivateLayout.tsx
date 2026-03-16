import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PrivateSidebar } from "@/components/private/PrivateSidebar";

interface PrivateLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function PrivateLayout({ children, title }: PrivateLayoutProps) {
  return (
    <div className="private-app">
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <PrivateSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-14 flex items-center gap-3 border-b border-border px-4 shrink-0">
              <SidebarTrigger />
              {title && (
                <h1 className="text-base font-semibold text-foreground tracking-tight">
                  {title}
                </h1>
              )}
            </header>
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
}
