import { Link } from "react-router-dom";
import { useUserAccount } from "@/contexts/UserAccountContext";
import { User, LogIn } from "lucide-react";

export default function AccountHeaderButton() {
  const { account, loading } = useUserAccount();

  if (loading) return null;

  if (account) {
    return (
      <Link
        to="/account"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold transition-colors hover:bg-primary/20"
        aria-label="Account"
        title={account.displayName || account.email}
      >
        {(account.displayName || account.email)[0]?.toUpperCase()}
      </Link>
    );
  }

  return (
    <Link
      to="/account"
      className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary"
      aria-label="Sign in"
      title="Sign in"
    >
      <LogIn size={16} />
    </Link>
  );
}
