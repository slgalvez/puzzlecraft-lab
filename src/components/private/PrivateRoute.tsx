import { useEffect, useState } from "react";
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
  const { user, loading, signOut, sessionEnded, clearSessionEnded } = useAuth();
  const location = useLocation();
  const [redirecting, setRedirecting] = useState(false);

  const isLoginPage = location.pathname === "/p/login";

  // Handle session ended by a newer login elsewhere — use effect to avoid side effects in render
  useEffect(() => {
    if (sessionEnded && !redirecting) {
      setRedirecting(true);
      clearSessionEnded();
      signOut();
    }
  }, [sessionEnded, redirecting, clearSessionEnded, signOut]);

  // Handle grace period expiry
  useEffect(() => {
    if (user && !isLoginPage && isGracePeriodExpired()) {
      setRedirecting(true);
      signOut();
    }
  }, [user, isLoginPage, signOut]);

  if (redirecting) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="private-app flex items-center justify-center min-h-screen">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!hasAccessGrant()) {
    return <Navigate to="/" replace />;
  }

  if (!user) {
    return <Navigate to="/p/login" replace />;
  }

  return <>{children}</>;
}