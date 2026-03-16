import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isApproved, loading } = useAuth();

  if (loading) {
    return (
      <div className="private-app flex items-center justify-center min-h-screen">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/p/login" replace />;
  }

  if (isApproved === false) {
    return (
      <div className="private-app flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <p className="text-sm text-foreground font-medium">Access unavailable</p>
          <p className="text-xs text-muted-foreground">
            Your account does not have access to this application.
          </p>
          <button
            onClick={() => {
              const { signOut } = useAuth();
              signOut();
            }}
            className="text-xs text-primary hover:underline"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
