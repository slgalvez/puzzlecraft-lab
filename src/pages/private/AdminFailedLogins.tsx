import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { invokeMessaging, SessionExpiredError } from "@/lib/privateApi";
import PrivateLayout from "@/components/private/PrivateLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, ShieldOff, Shield } from "lucide-react";

interface FailedAttempt {
  id: string;
  attempted_name: string;
  attempted_code: string;
  ip_address: string;
  user_agent: string | null;
  created_at: string;
  recent_failures: number;
  is_blocked: boolean;
}

export default function AdminFailedLogins() {
  const { user, token, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [attempts, setAttempts] = useState<FailedAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  const handleSessionExpired = useCallback(() => {
    signOut();
    navigate("/");
  }, [signOut, navigate]);

  const fetchData = useCallback(async () => {
    if (!token || !user) return;
    try {
      const data = await invokeMessaging("list-failed-logins", token);
      setAttempts(data.attempts || []);
    } catch (e) {
      if (e instanceof SessionExpiredError) handleSessionExpired();
    } finally {
      setLoading(false);
    }
  }, [token, user, handleSessionExpired]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleBlock = async (ip: string) => {
    if (!token) return;
    try {
      await invokeMessaging("block-ip", token, { ip_address: ip });
      toast({ title: "IP blocked", description: ip });
      fetchData();
    } catch (e) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
      toast({ title: "Error", description: "Could not block IP", variant: "destructive" });
    }
  };

  const handleUnblock = async (ip: string) => {
    if (!token) return;
    try {
      await invokeMessaging("unblock-ip", token, { ip_address: ip });
      toast({ title: "IP unblocked", description: ip });
      fetchData();
    } catch (e) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
      toast({ title: "Error", description: "Could not unblock IP", variant: "destructive" });
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString();
  };

  if (user?.role !== "admin") {
    return (
      <PrivateLayout title="Access Denied">
        <p className="text-sm text-muted-foreground">Admin only.</p>
      </PrivateLayout>
    );
  }

  return (
    <PrivateLayout title="Failed Login Attempts">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldAlert className="h-4 w-4" />
          <span>Showing last 100 failed attempts. Polls every 10s.</span>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : attempts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No failed login attempts recorded.</p>
        ) : (
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Puzzle Name</TableHead>
                  <TableHead>Puzzle Code</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>24h Failures</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.attempted_name}</TableCell>
                    <TableCell className="font-mono text-xs">{a.attempted_code}</TableCell>
                    <TableCell className="font-mono text-xs">{a.ip_address}</TableCell>
                    <TableCell className="text-xs text-muted-foreground" title={new Date(a.created_at).toLocaleString()}>
                      {formatTime(a.created_at)}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium ${a.recent_failures >= 5 ? "text-destructive" : "text-muted-foreground"}`}>
                        {a.recent_failures}
                      </span>
                    </TableCell>
                    <TableCell>
                      {a.is_blocked ? (
                        <Badge variant="destructive" className="text-[10px]">Blocked</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {a.is_blocked ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleUnblock(a.ip_address)}
                        >
                          <ShieldOff className="h-3 w-3" />
                          Unblock
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                          onClick={() => handleBlock(a.ip_address)}
                        >
                          <Shield className="h-3 w-3" />
                          Block
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </PrivateLayout>
  );
}
