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
  const [puzzleName, setPuzzleName] = useState("");
  const [puzzleCode, setPuzzleCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (sessionEnded) {
      clearSessionEnded();
    }
  }, [sessionEnded, clearSessionEnded]);

  if (!hasValidGrant()) {
    return (
      <div className="private-app flex items-center justify-center min-h-screen">
        <p className="text-sm text-muted-foreground">Session unavailable</p>
      </div>);

  }

  if (loading) {
    return (
      <div className="private-app flex items-center justify-center min-h-screen">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>);

  }

  if (user) {
    return <Navigate to="/p" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const nameParts = puzzleName.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    if (!firstName || !lastName || !puzzleCode) {
      setError("All fields are required");
      return;
    }
    if (puzzleName.length > 200 || puzzleCode.length > 200) {
      setError("Access unavailable");
      return;
    }

    setSubmitting(true);
    console.debug("[login] submitting...");
    try {
      // Race signIn against a 35s timeout so "Entering" never hangs forever
      const result = await Promise.race([
        signIn(firstName, lastName, puzzleCode),
        new Promise<{ error: string }>((resolve) =>
          setTimeout(() => {
            console.warn("[login] signIn timed out after 35s");
            resolve({ error: "Connection timed out — please try again" });
          }, 35_000)
        ),
      ]);
      if (result.error) {
        console.debug("[login] error:", result.error);
        setError(result.error);
      } else {
        console.debug("[login] success");
      }
    } catch (err) {
      console.warn("[login] unexpected error", err);
      setError("Something went wrong — please try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="private-app flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Icon + Title + Subtext */}
        <div className="text-center space-y-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">
              Puzzle Lab
            </h1>
            <p className="mt-2 text-xs text-muted-foreground/70">
              Enter your puzzle to continue
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Puzzle Name
            </label>
            <Input
              type="text"
              value={puzzleName}
              onChange={(e) => setPuzzleName(e.target.value)}
              placeholder="Puzzle Name"
              className="bg-secondary border-border text-foreground h-11 px-4"
              required
              autoComplete="name"
              maxLength={200} />
            
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Puzzle Code
            </label>
            <Input
              type="password"
              value={puzzleCode}
              onChange={(e) => setPuzzleCode(e.target.value)}
              placeholder="Code"
              className="bg-secondary border-border text-foreground h-11 px-4"
              required
              autoComplete="current-password"
              maxLength={200} />
            
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button
            type="submit"
            className="w-full h-11"
            disabled={submitting}>
            
            {submitting ? "Entering..." : "Enter Puzzle"}
          </Button>
        </form>

        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground/50 hover:text-muted-foreground"
          onClick={() => window.location.href = "/"}>
          Exit
        </Button>

      </div>
    </div>);

}