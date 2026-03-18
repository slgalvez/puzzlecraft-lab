import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const ACCESS_GRANT_KEY = "private_access_grant";
const LAST_ACTIVE_KEY = "private_last_active";
const GRACE_PERIOD_MS = 5 * 60 * 1000;

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

/** Check if user has been away longer than the grace period */
function isGracePeriodExpired(): boolean {
  const lastActive = localStorage.getItem(LAST_ACTIVE_KEY);
  if (!lastActive) return false;
  return Date.now() - Number(lastActive) > GRACE_PERIOD_MS;
}

export default function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut, sessionEnded } = useAuth();
  const location = useLocation();

  // The login page handles its own gating — let it through without access grant checks
  const isLoginPage = location.pathname === "/p/login";

  // If session was ended by a newer login elsewhere, redirect out
  // If session was ended by a newer login elsewhere, clean up and redirect home
  if (sessionEnded) {
    signOut();
    return <Navigate to="/" replace />;
  }

  // If grace period expired, force full logout
  if (user && isGracePeriodExpired()) {
    signOut();
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="private-app flex items-center justify-center min-h-screen">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Login page manages its own access grant check — don't redirect it away
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Must have a valid access grant to enter the private area
  if (!hasAccessGrant()) {
    return <Navigate to="/" replace />;
  }

  if (!user) {
    return <Navigate to="/p/login" replace />;
  }

  return <>{children}</>;
}