/**
 * useAdminPush.ts
 *
 * Browser Web Push subscription for main admin accounts.
 * Used to alert admins when new bug reports are submitted.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY =
  "BNMV-W_UX_Jcq9A9Ff2zC9KP407ttvg0qOKd5E_xR3CniOvdAHabHKZjJIWvwN2j4oW4Pi_WmC--gzF6s8d3Fng";

function urlB64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function bufToB64Url(buf: ArrayBuffer | null) {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return (await navigator.serviceWorker.ready) ?? null;
  } catch {
    return null;
  }
}

export function useAdminPush() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;
    setIsSupported(supported);
    if (!supported) return;
    setPermission(Notification.permission);
    (async () => {
      const reg = await getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    })();
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported) return { ok: false, error: "Push not supported" };
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return { ok: false, error: "Permission denied" };

      const reg = await getRegistration();
      if (!reg) return { ok: false, error: "Service worker not ready" };

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const endpoint = sub.endpoint;
      const p256dh = bufToB64Url(sub.getKey("p256dh"));
      const auth = bufToB64Url(sub.getKey("auth"));

      const { data, error } = await supabase.functions.invoke("admin-push", {
        body: { action: "subscribe", endpoint, p256dh, auth },
      });
      if (error || (data as any)?.error) {
        return { ok: false, error: (data as any)?.error || error?.message };
      }
      setIsSubscribed(true);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    } finally {
      setBusy(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    setBusy(true);
    try {
      const reg = await getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      const endpoint = sub?.endpoint;
      if (sub) await sub.unsubscribe().catch(() => {});
      await supabase.functions.invoke("admin-push", {
        body: { action: "unsubscribe", endpoint },
      });
      setIsSubscribed(false);
      return { ok: true };
    } finally {
      setBusy(false);
    }
  }, []);

  const sendTest = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("admin-push", {
      body: { action: "test" },
    });
    if (error) return { ok: false, error: error.message };
    return data as { ok: boolean; sent?: number; error?: string };
  }, []);

  return { isSupported, permission, isSubscribed, busy, subscribe, unsubscribe, sendTest };
}
