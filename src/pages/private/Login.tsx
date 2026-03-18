import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const ACCESS_GRANT_KEY = "private_access_grant";

function hasValidGrant(): boolean {
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

export default function LoginPage() {
  const { user, loading, signIn, sessionEnded, clearSessionEnded } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // If arriving at login with a stale session ended flag, clear it so the form shows
  useEffect(() => {
    if (sessionEnded) {
      clearSessionEnded();
    }
  }, [sessionEnded, clearSessionEnded]);

  // If no valid access grant, deny immediately (no async gate check needed —
  // the grant is now set synchronously by Index before navigating here)
  if (!hasValidGrant()) {
    return (
      <div className="private-app flex items-center justify-center min-h-screen">
        <p className="text-sm text-muted-foreground">Session unavailable</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="private-app flex items-center justify-center min-h-screen">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Already logged in — go straight to private area
  if (user) {
    return <Navigate to="/p" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!firstName.trim() || !lastName.trim() || !password) {
      setError("All fields are required");
      return;
    }
    if (firstName.length > 100 || lastName.length > 100 || password.length > 200) {
      setError("Access unavailable");
      return;
    }

    setSubmitting(true);
    const { error: signInError } = await signIn(firstName, lastName, password);
    if (signInError) setError("Access unavailable");
    setSubmitting(false);
  };

  return (
    <div className="private-app flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-foreground tracking-tight">Puzzle Lab</h1>
          <p className="mt-1 text-xs text-muted-foreground">Enter your credentials to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">First Name</label>
            <Input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" className="bg-secondary border-border text-foreground" required autoComplete="given-name" maxLength={100} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Last Name</label>
            <Input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" className="bg-secondary border-border text-foreground" required autoComplete="family-name" maxLength={100} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Password</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="bg-secondary border-border text-foreground" required autoComplete="current-password" maxLength={200} />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground hover:text-foreground"
          onClick={() => window.location.href = "/"}
        >
          Exit
        </Button>
      </div>
    </div>
  );
}