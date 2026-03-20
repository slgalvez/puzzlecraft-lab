/**
 * Private notification system — coded phrases, batching, context-aware delivery.
 * Messages = low urgency (batched ~8 min), Calls = live interaction (immediate).
 */

const SETTINGS_KEY = "private_notifications_enabled";
const LAST_MSG_NOTIFY_KEY = "private_last_msg_notify";
const BATCH_WINDOW_MS = 8 * 60 * 1000; // 8 minutes
const PHRASE_INDEX_KEY = "private_phrase_idx";

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
  | "outside-app"      // not on site → push notification
  | "on-site"          // on site but not in messenger → in-app banner
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

// ── Push notification ──

export async function requestPushPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function sendPushNotification(body: string): void {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (!getNotificationsEnabled()) return;

  try {
    const n = new Notification("Puzzlecraft", {
      body,
      icon: "/pwa-icon-192.png",
      tag: "private-notification",
      renotify: true,
      silent: false,
    });

    n.onclick = () => {
      window.focus();
      n.close();
      // Routing handled by the app — login security is not bypassed
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
