import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t bg-surface-warm">
    <div className="container py-10">
      <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
        <div>
          <p className="font-display text-lg font-semibold text-foreground">Puzzlecraft</p>
          <p className="mt-1 text-sm text-muted-foreground">Daily puzzles for curious minds.</p>
        </div>
        <nav className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
          <Link to="/help" className="hover:text-foreground transition-colors">Help</Link>
          <Link to="/puzzles" className="hover:text-foreground transition-colors">Puzzles</Link>
        </nav>
      </div>
      <p className="mt-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Puzzlecraft. All rights reserved.
      </p>
    </div>
  </footer>
);

export default Footer;
