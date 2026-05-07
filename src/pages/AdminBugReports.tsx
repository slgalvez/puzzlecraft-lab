import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUserAccount } from "@/contexts/UserAccountContext";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, RefreshCw, Bug } from "lucide-react";
import { toast } from "sonner";

interface BugReport {
  id: string;
  user_id: string | null;
  user_email: string | null;
  message: string;
  route: string | null;
  user_agent: string | null;
  platform: string | null;
  status: string;
  created_at: string;
}

type StatusFilter = "all" | "new" | "triaged" | "resolved";
type DateFilter = "all" | "24h" | "7d" | "30d";

export default function AdminBugReports() {
  const navigate = useNavigate();
  const { account } = useUserAccount();
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bug_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      toast.error("Failed to load bug reports");
    } else {
      setReports((data || []) as BugReport[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (account?.isAdmin) fetchReports();
  }, [account, fetchReports]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoff =
      dateFilter === "24h" ? now - 24 * 3600 * 1000 :
      dateFilter === "7d" ? now - 7 * 24 * 3600 * 1000 :
      dateFilter === "30d" ? now - 30 * 24 * 3600 * 1000 : 0;
    const q = search.trim().toLowerCase();
    return reports.filter(r => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (cutoff && new Date(r.created_at).getTime() < cutoff) return false;
      if (q) {
        const hay = `${r.message} ${r.user_email ?? ""} ${r.route ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [reports, statusFilter, dateFilter, search]);

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    const { error } = await supabase
      .from("bug_reports")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast.error("Failed to update status");
    } else {
      setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    }
    setUpdatingId(null);
  };

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

  const statusVariant = (s: string) =>
    s === "new" ? "default" : s === "triaged" ? "secondary" : "outline";

  return (
    <Layout>
      <div className="container max-w-4xl py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Button variant="outline" size="sm" onClick={fetchReports} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Bug className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Bug Reports</h1>
          <span className="text-sm text-muted-foreground ml-auto">{filtered.length} of {reports.length}</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="triaged">Triaged</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
            <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Search message, email, route…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No reports match the filters.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => (
              <div key={r.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                    {r.platform && (
                      <span className="text-xs text-muted-foreground">· {r.platform}</span>
                    )}
                  </div>
                  <Select
                    value={r.status}
                    onValueChange={(v) => updateStatus(r.id, v)}
                    disabled={updatingId === r.id}
                  >
                    <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="triaged">Triaged</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-sm whitespace-pre-wrap break-words">{r.message}</p>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {r.route && <div>Route: <span className="font-mono">{r.route}</span></div>}
                  {r.user_email && <div>Email: {r.user_email}</div>}
                  {r.user_id && <div>User ID: <span className="font-mono">{r.user_id}</span></div>}
                  {r.user_agent && <div className="truncate">UA: {r.user_agent}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
