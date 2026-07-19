import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// Narrow typed wrapper around the beta supabase.auth.oauth namespace.
type OAuthResult = {
  data?: {
    client?: { name?: string; client_id?: string; logo_uri?: string };
    redirect_url?: string;
    redirect_to?: string;
    scope?: string;
    scopes?: string[];
    redirect_uri?: string;
  } | null;
  error?: { message?: string } | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function oauthApi(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase.auth as any).oauth;
}

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<OAuthResult["data"]>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        navigate(`/account?next=${encodeURIComponent(next)}`, { replace: true });
        return;
      }
      try {
        const res: OAuthResult = await oauthApi().getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (res.error) {
          setError(res.error.message ?? "Could not load this authorization request.");
          return;
        }
        const immediate = res.data?.redirect_url ?? res.data?.redirect_to;
        if (immediate && !res.data?.client) {
          window.location.href = immediate;
          return;
        }
        setDetails(res.data ?? null);
      } catch (e) {
        if (!active) return;
        setError((e as Error).message);
      }
    })();
    return () => {
      active = false;
    };
  }, [authorizationId, navigate]);

  async function decide(approve: boolean) {
    setBusy(true);
    try {
      const res: OAuthResult = approve
        ? await oauthApi().approveAuthorization(authorizationId)
        : await oauthApi().denyAuthorization(authorizationId);
      if (res.error) {
        setError(res.error.message ?? "Authorization failed.");
        setBusy(false);
        return;
      }
      const target = res.data?.redirect_url ?? res.data?.redirect_to;
      if (!target) {
        setError("No redirect returned by the authorization server.");
        setBusy(false);
        return;
      }
      window.location.href = target;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full rounded-2xl border bg-card p-6 space-y-3">
          <h1 className="font-display text-xl font-bold text-foreground">Authorization error</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="secondary" onClick={() => navigate("/")}>Back to Puzzlecraft</Button>
        </div>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="animate-spin" size={16} /> Loading…
        </div>
      </main>
    );
  }

  const clientName = details.client?.name ?? "an app";
  const redirectUri = details.redirect_uri ?? "";
  const scopeList =
    details.scopes ?? (details.scope ? details.scope.split(/\s+/).filter(Boolean) : []);

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full rounded-2xl border bg-card p-6 space-y-4">
        <div className="space-y-1">
          <h1 className="font-display text-xl font-bold text-foreground">
            Connect {clientName} to Puzzlecraft
          </h1>
          <p className="text-sm text-muted-foreground">
            This lets {clientName} use Puzzlecraft as you.
          </p>
        </div>

        {redirectUri && (
          <div className="text-[11px] text-muted-foreground/70 break-all">
            Redirects to: <span className="text-muted-foreground">{redirectUri}</span>
          </div>
        )}

        {scopeList.length > 0 && (
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            {scopeList.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        )}

        <p className="text-[11px] text-muted-foreground/60">
          This doesn't bypass Puzzlecraft's permissions or backend policies.
        </p>

        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => decide(true)} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" size={16} /> : "Approve"}
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => decide(false)} disabled={busy}>
            Cancel connection
          </Button>
        </div>
      </div>
    </main>
  );
}
