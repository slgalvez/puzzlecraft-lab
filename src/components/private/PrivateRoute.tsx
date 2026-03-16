import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const ACCESS_GRANT_KEY = "private_access_grant";

function hasAccessGrant(): boolean {
  try {
    const raw = sessionStorage.getItem(ACCESS_GRANT_KEY);
    if (!raw) return false;
    const { exp } = JSON.parse(raw);
    if (!exp || exp < Math.floor(Date.now() / 1000)) {
      sessionStorage.removeItem(ACCESS_GRANT_KEY);
      return false;
    }
    return true;
  } catch {
    sessionStorage.removeItem(ACCESS_GRANT_KEY);
    return false;
  }
}

export default function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="private-app flex items-center justify-center min-h-screen">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Must have either an active login session or a valid access grant
  if (!user && !hasAccessGrant()) {
    return (
      <div className="private-app flex items-center justify-center min-h-screen">
        <p className="text-sm text-muted-foreground">Session unavailable</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/p/login" replace />;
  }

  return <>{children}</>;
}
