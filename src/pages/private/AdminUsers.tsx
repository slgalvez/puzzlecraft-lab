import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { invokeMessaging, SessionExpiredError } from "@/lib/privateApi";
import PrivateLayout from "@/components/private/PrivateLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, KeyRound, Trash2 } from "lucide-react";

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
  const { token, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Add user form
  const [showForm, setShowForm] = useState(false);
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);
  const [addSuccess, setAddSuccess] = useState("");

  // Reset password
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState("");

  const handleSessionExpired = useCallback(() => {
    signOut();
    navigate("/");
  }, [signOut, navigate]);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      const data = await invokeMessaging("list-users", token);
      setUsers(data.users);
    } catch (e) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
    } finally {
      setLoading(false);
    }
  }, [token, handleSessionExpired]);

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
    } catch (e) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
      toast({ title: "Action failed", description: "Please try again." });
    } finally {
      setToggling(null);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    setAddSuccess("");

    if (!newFirst.trim() || !newLast.trim() || !newPassword) {
      setAddError("All fields are required");
      return;
    }
    if (newPassword.length < 8) {
      setAddError("Password must be at least 8 characters");
      return;
    }

    setAdding(true);
    try {
      await invokeMessaging("add-user", token!, {
        first_name: newFirst.trim(),
        last_name: newLast.trim(),
        password: newPassword,
      });
      setAddSuccess(`${newFirst.trim()} ${newLast.trim()} added successfully`);
      setNewFirst("");
      setNewLast("");
      setNewPassword("");
      fetchUsers();
      setTimeout(() => setAddSuccess(""), 4000);
    } catch (e: any) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
      setAddError(e.message || "Could not add user");
    } finally {
      setAdding(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!token || !resetPassword) return;
    if (resetPassword.length < 4) {
      setResetMsg("Password must be at least 4 characters");
      return;
    }
    setResetting(true);
    setResetMsg("");
    try {
      await invokeMessaging("reset-password", token, {
        authorized_user_id: userId,
        new_password: resetPassword,
      });
      setResetMsg("Password reset successfully");
      setResetPassword("");
      setTimeout(() => {
        setResetUserId(null);
        setResetMsg("");
      }, 2000);
    } catch (e: any) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
      setResetMsg(e.message || "Could not reset password");
    } finally {
      setResetting(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!token) return;
    setDeleting(userId);
    try {
      await invokeMessaging("delete-user", token, { authorized_user_id: userId });
      setUsers((prev) => prev.filter((x) => x.id !== userId));
      setConfirmDelete(null);
    } catch (e) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
      toast({ title: "Could not delete user", description: "Please try again." });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <PrivateLayout title="Users">
      <div className="p-4 sm:p-6 space-y-6">
        {/* Add user section */}
        <div className="rounded-lg border border-border bg-card">
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full flex items-center gap-2 px-4 sm:px-5 py-3 text-sm font-semibold text-foreground hover:bg-secondary/40 transition-colors"
          >
            <UserPlus size={14} />
            Add New User
          </button>
          {showForm && (
            <form onSubmit={handleAddUser} className="px-4 sm:px-5 pb-5 space-y-3 border-t border-border pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">First Name</label>
                  <Input
                    value={newFirst}
                    onChange={(e) => setNewFirst(e.target.value)}
                    placeholder="First name"
                    className="bg-secondary border-border text-foreground"
                    maxLength={100}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Last Name</label>
                  <Input
                    value={newLast}
                    onChange={(e) => setNewLast(e.target.value)}
                    placeholder="Last name"
                    className="bg-secondary border-border text-foreground"
                    maxLength={100}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Password</label>
                <Input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Set a password"
                  className="bg-secondary border-border text-foreground font-mono text-sm"
                  maxLength={200}
                  required
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  The password is visible here so you can share it with the user. It will be securely hashed before storage.
                </p>
              </div>
              {addError && <p className="text-xs text-destructive">{addError}</p>}
              {addSuccess && <p className="text-xs text-primary">{addSuccess}</p>}
              <Button type="submit" size="sm" disabled={adding}>
                {adding ? "Adding..." : "Create User"}
              </Button>
            </form>
          )}
        </div>

        {/* User list */}
        <div className="rounded-lg border border-border bg-card">
          <div className="px-4 sm:px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Authorized Users</h2>
          </div>
          {loading ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground animate-pulse">Loading...</div>
          ) : users.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">No users found.</div>
          ) : (
            <div className="divide-y divide-border">
              {users.map((u) => (
                <div key={u.id} className="px-4 sm:px-5 py-4">
                  <div className="flex items-center justify-between gap-2">
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
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
                          onClick={() => {
                            setResetUserId(resetUserId === u.id ? null : u.id);
                            setResetPassword("");
                            setResetMsg("");
                          }}
                        >
                          <KeyRound size={12} className="mr-1" />
                          Reset
                        </Button>
                        <Button
                          variant={u.is_active ? "outline" : "default"}
                          size="sm"
                          className="text-xs border-border h-7 px-2"
                          disabled={toggling === u.id}
                          onClick={() => handleToggle(u.id, u.is_active)}
                        >
                          {u.is_active ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2"
                          disabled={deleting === u.id}
                          onClick={() => setConfirmDelete(confirmDelete === u.id ? null : u.id)}
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    )}
                  </div>
                  {resetUserId === u.id && (
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <Input
                        type="text"
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        placeholder="New password"
                        className="bg-secondary border-border text-foreground font-mono text-xs h-8 max-w-[200px]"
                        maxLength={200}
                      />
                      <Button
                        size="sm"
                        className="h-8 text-xs"
                        disabled={resetting || !resetPassword}
                        onClick={() => handleResetPassword(u.id)}
                      >
                        {resetting ? "Saving..." : "Save"}
                      </Button>
                      {resetMsg && (
                        <span className={`text-xs ${resetMsg.includes("success") ? "text-primary" : "text-destructive"}`}>
                          {resetMsg}
                        </span>
                      )}
                    </div>
                  )}
                  {confirmDelete === u.id && (
                    <div className="mt-3 flex items-center gap-2 p-2.5 rounded-md bg-destructive/5 border border-destructive/20 flex-wrap">
                      <p className="text-xs text-destructive flex-1 min-w-[150px]">
                        Permanently delete {u.first_name} {u.last_name}? This removes all their messages and cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs border-border"
                          onClick={() => setConfirmDelete(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={deleting === u.id}
                          onClick={() => handleDelete(u.id)}
                        >
                          {deleting === u.id ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </div>
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
