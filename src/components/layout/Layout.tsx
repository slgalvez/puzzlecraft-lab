import Header from "./Header";
import Footer from "./Footer";
import { isNativeApp } from "@/lib/appMode";
import IOSTabBar from "@/components/ios/IOSTabBar";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const native = isNativeApp();

  if (native) {
    return (
      <div className="flex flex-col h-[100dvh]" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden ios-scroll-container">
          {children}
        </main>
        <IOSTabBar />
      </div>
    );
  }

  return (
    <div
      className="flex min-h-[100dvh] flex-col"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
};

export default Layout;
