import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import AccountHeaderButton from "@/components/account/AccountHeaderButton";
import { getSavedCount } from "@/lib/savedPuzzles";

const Header = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const savedCount = useMemo(() => getSavedCount(), []);

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/daily", label: "Daily Challenge" },
    { to: "/puzzles", label: savedCount > 0 ? `Play · ${savedCount}` : "Play" },
    { to: "/generate/sudoku", label: "Puzzle Lab" },
    { to: "/craft", label: "Craft" },
    { to: "/stats", label: "Stats" },
  ];

  const isActive = (to: string) => {
    if (to === "/") return location.pathname === "/";
    if (to.startsWith("/generate")) return location.pathname.startsWith("/generate");
    if (to === "/craft") return location.pathname.startsWith("/craft");
    return location.pathname === to;
  };

  return (
    <header className="pwa-safe-top sticky top-0 z-50 border-b bg-surface-elevated/80 backdrop-blur-md" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="container flex h-16 items-center">
        <Link to="/" className="font-display text-2xl font-bold tracking-tight text-foreground">
          Puzzlecraft
        </Link>

        {/* Desktop nav */}
        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(link.to)
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-2">
          {/* Account button - desktop */}
          <div className="hidden md:block">
            <AccountHeaderButton />
          </div>

          {/* Mobile toggle */}
          <button
            className="inline-flex items-center justify-center rounded-md p-2 text-foreground md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="border-t bg-surface-elevated px-4 pt-2 pb-4 md:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "block rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive(link.to)
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 px-3">
            <AccountHeaderButton />
          </div>
        </nav>
      )}
    </header>
  );
};

export default Header;
