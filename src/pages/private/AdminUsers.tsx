import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { invokeMessaging } from "@/lib/privateApi";
import PrivateLayout from "@/components/private/PrivateLayout";
import { Button } from "@/components/ui/button";

interface UserInfo {
  id: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  created_at: string;
  profile_id: string;
  role: string;
}

const AdminUsers = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      const data = await invokeMessaging("list-users", token);
      setUsers(data.users);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggle = async (userId: string, currentActive: boolean) => {
    if (!token) return;
    setToggling(userId);
    try {
      await invokeMessaging("toggle-user-active", token, {
        authorized_user_id: userId,
        is_active: !currentActive,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: !currentActive } : u))
      );
    } catch {
      // Could show error
    } finally {
      setToggling(null);
    }
  };

  return (
    <PrivateLayout title="Users">
      <div className="p-6">
        <div className="rounded-lg border border-border bg-card">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Authorized Users</h2>
          </div>
          {loading ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : users.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">No users found.</div>
          ) : (
            <div className="divide-y divide-border">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {u.first_name} {u.last_name}
                      </p>
                      {u.role === "admin" && (
                        <span className="text-[10px] uppercase tracking-wider text-primary font-medium">Admin</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {u.is_active ? "Active" : "Deactivated"} · Joined{" "}
                      {new Date(u.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  {u.role !== "admin" && (
                    <Button
                      variant={u.is_active ? "outline" : "default"}
                      size="sm"
                      className="text-xs border-border"
                      disabled={toggling === u.id}
                      onClick={() => handleToggle(u.id, u.is_active)}
                    >
                      {u.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PrivateLayout>
  );
};

export default AdminUsers;
