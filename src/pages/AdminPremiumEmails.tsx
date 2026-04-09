/**
 * AdminPremiumEmails.tsx
 *
 * CHANGES:
 * - Added "Sync all" button that calls manage-premium-emails?action=sync
 *   to immediately backfill premium to all listed emails that have accounts.
 * - Edge function now uses premium_email_list table (not premium_emails).
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUserAccount } from "@/contexts/UserAccountContext";
import Layout from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Trash2, Crown, Loader2, Pencil, Check, X, RefreshCw } from "lucide-react";
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
  const [emails,      setEmails]      = useState<PremiumEmail[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [newEmail,    setNewEmail]    = useState("");
  const [newNote,     setNewNote]     = useState("");
  const [adding,      setAdding]      = useState(false);
  const [syncing,     setSyncing]     = useState(false);
  const [removingId,  setRemovingId]  = useState<string | null>(null);
  const [editingNoteId,   setEditingNoteId]   = useState<string | null>(null);
  const [editNoteValue,   setEditNoteValue]   = useState("");

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
    } catch {
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
          <Button variant="outline" className="mt-4" onClick={() => navigate("/account")}>Go back</Button>
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
        toast.success(`${email} added — Plus granted immediately if they have an account`);
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
      toast.success(`${email} removed — Plus revoked`);
      setEmails((prev) => prev.filter((e) => e.id !== id));
    } catch {
      toast.error("Failed to remove email");
    } finally {
      setRemovingId(null);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await api("sync");
      toast.success(`Synced ${result.synced} email${result.synced !== 1 ? "s" : ""} — Plus granted to all matching accounts`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
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

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown size={20} className="text-primary" />
            <h1 className="text-xl font-bold text-foreground">Premium Access</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handleSync}
            disabled={syncing || emails.length === 0}
          >
            {syncing
              ? <Loader2 size={12} className="animate-spin" />
              : <RefreshCw size={12} />
            }
            Sync all
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Add email addresses to grant free Puzzlecraft+. Existing accounts get Plus immediately.
          New signups with listed emails get Plus automatically on first login.
          Use "Sync all" to backfill any accounts that weren't updated automatically.
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
          <Button onClick={handleAdd} disabled={adding || !newEmail.trim()} className="w-full">
            {adding
              ? <Loader2 size={14} className="animate-spin mr-2" />
              : <Plus size={14} className="mr-2" />
            }
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
              <div key={entry.id} className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 group">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{entry.email}</p>
                  {editingNoteId === entry.id ? (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Input
                        value={editNoteValue}
                        onChange={(e) => setEditNoteValue(e.target.value)}
                        placeholder="Add a note..."
                        className="h-6 text-[11px] px-2 py-0"
                        autoFocus
                        onKeyDown={async (e) => {
                          if (e.key === "Enter") {
                            await api("update-note", { id: entry.id, note: editNoteValue });
                            setEmails((prev) => prev.map((em) =>
                              em.id === entry.id ? { ...em, note: editNoteValue.trim() || null } : em
                            ));
                            setEditingNoteId(null);
                            toast.success("Note updated");
                          }
                          if (e.key === "Escape") setEditingNoteId(null);
                        }}
                      />
                      <button className="text-primary hover:text-primary/80" onClick={async () => {
                        await api("update-note", { id: entry.id, note: editNoteValue });
                        setEmails((prev) => prev.map((em) =>
                          em.id === entry.id ? { ...em, note: editNoteValue.trim() || null } : em
                        ));
                        setEditingNoteId(null);
                        toast.success("Note updated");
                      }}>
                        <Check size={12} />
                      </button>
                      <button className="text-muted-foreground hover:text-foreground" onClick={() => setEditingNoteId(null)}>
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      className="flex items-center gap-1 mt-0.5 group/note"
                      onClick={() => { setEditingNoteId(entry.id); setEditNoteValue(entry.note || ""); }}
                    >
                      <p className="text-[11px] text-muted-foreground truncate">
                        {entry.note || "Add note..."}
                      </p>
                      <Pencil size={9} className="text-muted-foreground/30 group-hover/note:text-muted-foreground transition-colors shrink-0" />
                    </button>
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
                  {removingId === entry.id
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Trash2 size={14} />
                  }
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
