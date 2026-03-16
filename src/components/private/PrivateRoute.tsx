import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

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

  return <>{children}</>;
}
