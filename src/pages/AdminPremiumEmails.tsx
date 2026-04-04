import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUserAccount } from "@/contexts/UserAccountContext";
import Layout from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Trash2, Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PremiumEmail {
  id: string;
  email: string;
  note: string | null;
  created_at: string;
}

export default function AdminPremiumEmails() {
  const navigate = useNavigate();
  const { account } = useUserAccount();
  const [emails, setEmails] = useState<PremiumEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [newNote, setNewNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const api = useCallback(async (action: string, body: Record<string, unknown> = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const resp = await supabase.functions.invoke("manage-premium-emails", {
      body: { action, ...body },
    });

    if (resp.error) throw new Error(resp.error.message);
    return resp.data;
  }, []);

  const fetchEmails = useCallback(async () => {
    try {
      const data = await api("list");
      setEmails(data.emails || []);
    } catch (e) {
      toast.error("Failed to load premium emails");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (account?.isAdmin) fetchEmails();
  }, [account, fetchEmails]);

  if (!account?.isAdmin) {
    return (
      <Layout>
        <div className="container max-w-md py-16 text-center">
          <p className="text-muted-foreground">Admin access required</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/account")}>
            Go back
          </Button>
        </div>
      </Layout>
    );
  }

  const handleAdd = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email) return;

    setAdding(true);
    try {
      const result = await api("add", { email, note: newNote.trim() || null });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${email} added — they'll get Puzzlecraft+ automatically`);
        setNewEmail("");
        setNewNote("");
        fetchEmails();
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add email");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: string, email: string) => {
    setRemovingId(id);
    try {
      await api("remove", { id });
      toast.success(`${email} removed from premium list`);
      setEmails((prev) => prev.filter((e) => e.id !== id));
    } catch {
      toast.error("Failed to remove email");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Layout>
      <div className="container max-w-md py-8 space-y-5 pb-24">
        <button
          onClick={() => navigate("/account")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} /> Back to Account
        </button>

        <div className="flex items-center gap-2">
          <Crown size={20} className="text-primary" />
          <h1 className="text-xl font-bold text-foreground">Premium Access</h1>
        </div>

        <p className="text-sm text-muted-foreground">
          Add email addresses to automatically grant free Puzzlecraft+ when they sign up or sign in. Existing accounts get premium immediately.
        </p>

        {/* Add form */}
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <Input
            placeholder="email@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            type="email"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Input
            placeholder="Note (optional) — e.g. 'Beta tester'"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button
            onClick={handleAdd}
            disabled={adding || !newEmail.trim()}
            className="w-full"
          >
            {adding ? <Loader2 size={14} className="animate-spin mr-2" /> : <Plus size={14} className="mr-2" />}
            Add to Premium List
          </Button>
        </div>

        {/* Email list */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {emails.length} premium {emails.length === 1 ? "email" : "emails"}
          </p>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-muted-foreground" />
            </div>
          ) : emails.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-card/50 p-6 text-center">
              <p className="text-sm text-muted-foreground">No premium emails yet</p>
            </div>
          ) : (
            emails.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 group"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{entry.email}</p>
                  {entry.note && (
                    <p className="text-[11px] text-muted-foreground truncate">{entry.note}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                    Added {new Date(entry.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemove(entry.id, entry.email)}
                  disabled={removingId === entry.id}
                >
                  {removingId === entry.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
