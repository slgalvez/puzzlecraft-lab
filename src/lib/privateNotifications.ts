/**
 * Private notification system — coded phrases, batching, context-aware delivery.
 * Messages = low urgency (batched ~8 min), Calls = live interaction (immediate).
 *
 * Push delivery uses the Web Push API via service worker subscription,
 * backed by the send-push edge function.
 */

const SETTINGS_KEY = "private_notifications_enabled";
const LAST_MSG_NOTIFY_KEY = "private_last_msg_notify";
const BATCH_WINDOW_MS = 8 * 60 * 1000; // 8 minutes
const PHRASE_INDEX_KEY = "private_phrase_idx";
const PUSH_SUB_KEY = "private_push_subscribed";
const VAPID_KEY_HASH_KEY = "private_vapid_key_hash";

// VAPID public key (matches the private key stored as a secret)
export const VAPID_PUBLIC_KEY =
  "BFkn49h7I0ULvu3Ta1UiFLMUsLW3JUNwD8yRQhIiV7AhncanXqPLiW4eu2rv7I6WmbFB67fX2kycpcHBvwk6k5g";

// ── Phrase pools ──

const MESSAGE_PHRASES = [
  "New challenge available",
  "Your next puzzle is ready",
  "Time for a quick brain break",
  "Daily puzzle refreshed",
  "You've got a new challenge",
  "Jump back in",
  "Ready when you are",
];

const CALL_PHRASES = [
  "Continue your session",
  "Resume where you left off",
  "Ready when you are",
  "Pick up where you left off",
  "Jump back in",
];

const CALL_CRAFT_PHRASES = [
  "Craft yours next",
  "Your next craft is waiting",
  "Continue crafting",
  "Start your next craft",
];

// ── Settings ──

export function getNotificationsEnabled(): boolean {
  const v = localStorage.getItem(SETTINGS_KEY);
  return v !== "false"; // default ON
}

export function setNotificationsEnabled(enabled: boolean): void {
  localStorage.setItem(SETTINGS_KEY, enabled ? "true" : "false");
}

// ── Phrase rotation (slight repetition bias) ──

function getRotatingPhrase(pool: string[], namespace: string): string {
  const key = `${PHRASE_INDEX_KEY}_${namespace}`;
  let idx = parseInt(localStorage.getItem(key) || "0", 10);
  // 30% chance to repeat the same phrase (repetition bias)
  if (Math.random() > 0.3) {
    idx = (idx + 1) % pool.length;
  }
  localStorage.setItem(key, String(idx));
  return pool[idx];
}

export function getMessagePhrase(count?: number): string {
  const phrase = getRotatingPhrase(MESSAGE_PHRASES, "msg");
  if (count && count > 1) return `${phrase} (${count})`;
  return phrase;
}

export function getCallPhrase(): string {
  // Occasionally use craft variations (~20%)
  if (Math.random() < 0.2) {
    return getRotatingPhrase(CALL_CRAFT_PHRASES, "call_craft");
  }
  return getRotatingPhrase(CALL_PHRASES, "call");
}

// ── Batching logic ──

export function shouldSendMessageNotification(): boolean {
  const last = parseInt(localStorage.getItem(LAST_MSG_NOTIFY_KEY) || "0", 10);
  return Date.now() - last > BATCH_WINDOW_MS;
}

export function markMessageNotificationSent(): void {
  localStorage.setItem(LAST_MSG_NOTIFY_KEY, String(Date.now()));
}

// ── Context detection ──

export type NotificationContext =
  | "outside-app" // not on site → push notification
  | "on-site" // on site but not in messenger → in-app banner
  | "in-conversation"; // inside conversation thread → silent

export function getNotificationContext(): NotificationContext {
  const path = window.location.pathname;
  if (path === "/p/conversation" || path.startsWith("/p/conversation/")) {
    return "in-conversation";
  }
  if (path.startsWith("/p")) {
    return "on-site";
  }
  return "outside-app";
}

// ── Push permission + subscription ──

export function getPermissionStatus(): NotificationPermission | "unsupported" {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export function isPwaMode(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export async function requestPushPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

function base64urlToUint8Array(base64url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

function uint8ArrayToBase64url(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function getSubscriptionKeys(subscription: PushSubscription): {
  p256dh: string;
  auth: string;
} {
  const jsonKeys = subscription.toJSON().keys || {};

  let p256dh = jsonKeys.p256dh || "";
  let auth = jsonKeys.auth || "";

  if ((!p256dh || !auth) && typeof subscription.getKey === "function") {
    const p256dhKey = subscription.getKey("p256dh");
    const authKey = subscription.getKey("auth");

    if (!p256dh && p256dhKey) {
      p256dh = uint8ArrayToBase64url(new Uint8Array(p256dhKey));
    }

    if (!auth && authKey) {
      auth = uint8ArrayToBase64url(new Uint8Array(authKey));
    }
  }

  return { p256dh, auth };
}

/**
 * Subscribe to push notifications via the service worker.
 * Returns the subscription or null if failed.
 */
export async function subscribeToPush(token: string): Promise<PushSubscription | null> {
  try {
    const permissionGranted = await requestPushPermission();
    if (!permissionGranted) return null;

    const registration = await navigator.serviceWorker.ready;
    if (!registration.pushManager) {
      console.warn("Push manager not available");
      return null;
    }

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const applicationServerKey = base64urlToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });
    }

    if (!subscription) return null;

    // Send subscription to backend
    const keys = getSubscriptionKeys(subscription);
    if (!keys.p256dh || !keys.auth) {
      console.error("Push subscription keys unavailable");
      return null;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const resp = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey,
      },
      body: JSON.stringify({
        action: "subscribe",
        token,
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      }),
    });

    if (resp.ok) {
      localStorage.setItem(PUSH_SUB_KEY, "true");
      return subscription;
    }

    console.error("Push subscribe API error:", await resp.text());
    return null;
  } catch (e) {
    console.error("subscribeToPush error:", e);
    return null;
  }
}

/**
 * Unsubscribe from push notifications.
 */
export async function unsubscribeFromPush(token: string): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager?.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      await fetch(`${supabaseUrl}/functions/v1/send-push`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey },
        body: JSON.stringify({ action: "unsubscribe", token, endpoint }),
      }).catch(() => {});
    }

    localStorage.removeItem(PUSH_SUB_KEY);
  } catch (e) {
    console.error("unsubscribeFromPush error:", e);
  }
}

/**
 * Check if there's an active push subscription.
 */
export async function getPushSubscriptionStatus(): Promise<{
  subscribed: boolean;
  endpoint?: string;
}> {
  try {
    if (!("serviceWorker" in navigator)) return { subscribed: false };
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager?.getSubscription();
    if (subscription) {
      return { subscribed: true, endpoint: subscription.endpoint };
    }
    return { subscribed: false };
  } catch {
    return { subscribed: false };
  }
}

/**
 * Send a test push notification to the current user's devices.
 */
export async function sendTestPush(token: string): Promise<{ ok: boolean; sent: number; error?: string }> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const resp = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey },
      body: JSON.stringify({ action: "test-push", token }),
    });

    return await resp.json();
  } catch (e) {
    return { ok: false, sent: 0, error: String(e) };
  }
}

// ── Legacy push notification (fallback for when SW push not available) ──

export function sendPushNotification(body: string): void {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (!getNotificationsEnabled()) return;

  try {
    const opts: NotificationOptions & Record<string, unknown> = {
      body,
      icon: "/pwa-icon-192.png",
      tag: "private-notification",
      silent: false,
    };
    const n = new Notification("Puzzlecraft", opts);

    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    // Notification API may not be available in all contexts
  }
}

// ── Main dispatch ──

export type NotifyEventType = "message" | "call";

export interface NotifyResult {
  action: "push" | "banner" | "silent";
  phrase: string;
}

/**
 * Determine how to notify the user and return the phrase + action.
 * Returns null if notification should be suppressed.
 */
export function dispatchNotification(
  eventType: NotifyEventType,
  messageCount?: number
): NotifyResult | null {
  if (!getNotificationsEnabled()) return null;

  const context = getNotificationContext();

  if (eventType === "message") {
    // Batching: suppress if within window
    if (!shouldSendMessageNotification()) return null;
    markMessageNotificationSent();

    const phrase = getMessagePhrase(messageCount);

    if (context === "in-conversation") return null;
    if (context === "on-site") return { action: "banner", phrase };
    return { action: "push", phrase };
  }

  if (eventType === "call") {
    // Calls are always immediate, no batching
    const phrase = getCallPhrase();

    if (context === "in-conversation") return null;
    if (context === "on-site") return { action: "banner", phrase };
    return { action: "push", phrase };
  }

  return null;
}
