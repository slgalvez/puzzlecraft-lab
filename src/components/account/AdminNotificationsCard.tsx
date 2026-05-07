import { useAdminPush } from "@/hooks/useAdminPush";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function AdminNotificationsCard() {
  const { isSupported, permission, isSubscribed, busy, subscribe, unsubscribe, sendTest } = useAdminPush();
  const [testing, setTesting] = useState(false);

  if (!isSupported) {
    return (
      <div className="rounded-2xl border border-border/50 px-4 py-3.5 space-y-1">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium">Admin notifications</span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Push not supported in this browser.
        </p>
      </div>
    );
  }

  const handleToggle = async (next: boolean) => {
    if (next) {
      const r = await subscribe();
      if (r.ok) toast.success("Bug report alerts enabled");
      else toast.error(r.error || "Could not enable");
    } else {
      await unsubscribe();
      toast.success("Alerts disabled");
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const r = await sendTest();
      if (r.ok) toast.success(`Test sent (${r.sent ?? 0})`);
      else toast.error(r.error || "Test failed");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border/50 px-4 py-3.5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Bell size={16} className="text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium">Bug report alerts</p>
            <p className="text-[11px] text-muted-foreground">
              {permission === "denied"
                ? "Notifications blocked in browser settings"
                : "Push when a new report comes in"}
            </p>
          </div>
        </div>
        <Switch
          checked={isSubscribed}
          disabled={busy || permission === "denied"}
          onCheckedChange={handleToggle}
        />
      </div>
      {isSubscribed && (
        <Button variant="outline" size="sm" className="w-full" onClick={handleTest} disabled={testing}>
          Send test notification
        </Button>
      )}
    </div>
  );
}
