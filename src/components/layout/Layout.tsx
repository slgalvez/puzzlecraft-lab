import Header from "./Header";
import Footer from "./Footer";
import { isNativeApp } from "@/lib/appMode";
import IOSTabBar from "@/components/ios/IOSTabBar";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const native = isNativeApp();

  return (
    <div className="flex min-h-screen flex-col">
      {!native && <Header />}
      <main className="flex-1">{children}</main>
      {!native && <Footer />}
      {native && <IOSTabBar />}
    </div>
  );
};

export default Layout;
