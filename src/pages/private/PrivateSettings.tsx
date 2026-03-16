import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { invokeMessaging, SessionExpiredError } from "@/lib/privateApi";
import PrivateLayout from "@/components/private/PrivateLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getFocusLossEnabled, setFocusLossEnabled } from "@/lib/focusLossSettings";

const PrivateSettings = () => {
  const { user, token, updateUser, signOut } = useAuth();
  const navigate = useNavigate();

  // Name form
  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState("");

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState("");

  const handleSessionExpired = useCallback(() => {
    signOut();
    navigate("/");
  }, [signOut, navigate]);

  const handleNameSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameMsg("");
    if (!firstName.trim() || !lastName.trim()) {
      setNameMsg("Both fields are required");
      return;
    }
    if (!token) return;
    setNameSaving(true);
    try {
      const data = await invokeMessaging("update-name", token, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      if (updateUser) {
        updateUser({ first_name: data.first_name, last_name: data.last_name });
      }
      setNameMsg("Name updated");
      setTimeout(() => setNameMsg(""), 3000);
    } catch (e: any) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
      setNameMsg(e.message || "Could not update name");
    } finally {
      setNameSaving(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg("");
    if (!currentPassword || !newPassword) {
      setPwMsg("All fields are required");
      return;
    }
    if (newPassword.length < 4) {
      setPwMsg("New password must be at least 4 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMsg("Passwords do not match");
      return;
    }
    if (!token) return;
    setPwSaving(true);
    try {
      await invokeMessaging("change-password", token, {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwMsg("Password changed");
      setTimeout(() => setPwMsg(""), 3000);
    } catch (e: any) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
      setPwMsg(e.message || "Could not change password");
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <PrivateLayout title="Settings">
      <div className="p-4 sm:p-6 max-w-lg space-y-8">
        {/* Display Name */}
        <form onSubmit={handleNameSave} className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Display Name</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                First Name
              </label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="bg-secondary border-border text-foreground"
                maxLength={100}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Last Name
              </label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="bg-secondary border-border text-foreground"
                maxLength={100}
                required
              />
            </div>
          </div>
          {nameMsg && (
            <p className={`text-xs ${nameMsg.includes("updated") ? "text-primary" : "text-destructive"}`}>
              {nameMsg}
            </p>
          )}
          <Button type="submit" size="sm" disabled={nameSaving}>
            {nameSaving ? "Saving..." : "Update Name"}
          </Button>
        </form>

        <div className="border-t border-border" />

        {/* Change Password */}
        <form onSubmit={handlePasswordSave} className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Change Password</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Current Password
              </label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="bg-secondary border-border text-foreground"
                maxLength={200}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                New Password
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-secondary border-border text-foreground"
                maxLength={200}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Confirm New Password
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-secondary border-border text-foreground"
                maxLength={200}
                required
              />
            </div>
          </div>
          {pwMsg && (
            <p className={`text-xs ${pwMsg.includes("changed") ? "text-primary" : "text-destructive"}`}>
              {pwMsg}
            </p>
          )}
          <Button type="submit" size="sm" disabled={pwSaving}>
            {pwSaving ? "Saving..." : "Change Password"}
          </Button>
        </form>
      </div>
    </PrivateLayout>
  );
};

export default PrivateSettings;
