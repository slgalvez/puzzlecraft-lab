/**
 * usePushNotifications.ts
 * src/hooks/usePushNotifications.ts
 *
 * Wires up Capacitor push notifications for:
 *   - Streak at risk (8pm local time if not played today)
 *   - Friend solved your craft puzzle
 *   - New craft puzzle received from a friend
 *
 * HOW TO INSTALL:
 *   npm install @capacitor/push-notifications
 *   npx cap sync
 *
 * Then add to ios/App/App/Info.plist:
 *   <key>NSUserNotificationsUsageDescription</key>
 *   <string>We'll remind you to keep your streak alive and notify you when friends solve your puzzles.</string>
 */

import { useEffect, useCallback } from "react";
import { isNativeApp } from "@/lib/appMode";

// ── Types (matches @capacitor/push-notifications API) ─────────────────────
// We type-import lazily so the web build doesn't fail if the package isn't installed

type PermissionState = "prompt" | "prompt-with-rationale" | "granted" | "denied";

interface PushPlugin {
  checkPermissions(): Promise<{ receive: PermissionState }>;
  requestPermissions(): Promise<{ receive: PermissionState }>;
  addListener(event: string, handler: (data: unknown) => void): Promise<{ remove: () => void }>;
  register(): Promise<void>;
}

// ── Lazy loader ───────────────────────────────────────────────────────────

async function getPushPlugin(): Promise<PushPlugin | null> {
  if (!isNativeApp()) return null;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    return PushNotifications as unknown as PushPlugin;
  } catch {
    console.warn("[Push] @capacitor/push-notifications not installed. Run: npm install @capacitor/push-notifications && npx cap sync");
    return null;
  }
}

// ── Token storage ─────────────────────────────────────────────────────────

const PUSH_TOKEN_KEY = "puzzlecraft_push_token";

export function getStoredPushToken(): string | null {
  try { return localStorage.getItem(PUSH_TOKEN_KEY); }
  catch { return null; }
}

function storePushToken(token: string) {
  try { localStorage.setItem(PUSH_TOKEN_KEY, token); }
  catch {}
}

// ── Main hook ─────────────────────────────────────────────────────────────

interface UsePushNotificationsOptions {
  /** Called when a registration token is received — use this to send it to Supabase */
  onTokenReceived?: (token: string) => void;
  /** Called when a notification is tapped — use this to navigate */
  onNotificationTapped?: (data: Record<string, string>) => void;
}

export function usePushNotifications({
  onTokenReceived,
  onNotificationTapped,
}: UsePushNotificationsOptions = {}) {

  const requestAndRegister = useCallback(async () => {
    const Push = await getPushPlugin();
    if (!Push) return;

    const { receive } = await Push.checkPermissions();

    if (receive === "granted") {
      await Push.register();
      return;
    }

    if (receive === "prompt" || receive === "prompt-with-rationale") {
      const result = await Push.requestPermissions();
      if (result.receive === "granted") {
        await Push.register();
      }
    }
    // If "denied" — don't prompt again, respect the user's choice
  }, []);

  useEffect(() => {
    let cleanups: Array<() => void> = [];

    const setup = async () => {
      const Push = await getPushPlugin();
      if (!Push) return;

      // Registration success — token received from APNs
      const reg = await Push.addListener("registration", (data: unknown) => {
        const token = (data as { value: string }).value;
        storePushToken(token);
        onTokenReceived?.(token);
      });
      cleanups.push(reg.remove);

      // Registration error
      const regErr = await Push.addListener("registrationError", (err: unknown) => {
        console.error("[Push] Registration error:", err);
      });
      cleanups.push(regErr.remove);

      // Notification received while app is open (foreground)
      const recv = await Push.addListener("pushNotificationReceived", (notification: unknown) => {
        console.log("[Push] Received in foreground:", notification);
      });
      cleanups.push(recv.remove);

      // User tapped a notification
      const tap = await Push.addListener("pushNotificationActionPerformed", (action: unknown) => {
        const data = (action as { notification: { data: Record<string, string> } })
          .notification.data;
        onNotificationTapped?.(data);
      });
      cleanups.push(tap.remove);
    };

    setup();
    return () => cleanups.forEach((fn) => fn());
  }, [onTokenReceived, onNotificationTapped]);

  return { requestAndRegister };
}

// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION TRIGGER HELPERS
// Call these from your Supabase Edge Functions (server-side) — NOT from the app.
// These are here as documentation for what your server needs to send.
// ══════════════════════════════════════════════════════════════════════════════

/**
 * TRIGGER 1: Streak at risk
 * Schedule this via a Supabase cron job at 20:00 local time for each user.
 * Only fire if: user has a streak > 0 AND hasn't completed today's daily challenge.
 *
 * Payload:
 * {
 *   to: "<APNs device token>",
 *   notification: {
 *     title: "Your streak is at risk 🔥",
 *     body: "You have a {streak}-day streak. Play today's puzzle to keep it alive.",
 *   },
 *   data: { type: "streak_warning", navigate: "/daily" }
 * }
 */

/**
 * TRIGGER 2: Friend solved your craft puzzle
 * Fire this from your Supabase webhook when shared_puzzles.completed_at is set.
 *
 * Payload:
 * {
 *   to: "<creator's APNs token>",
 *   notification: {
 *     title: "{recipient_name} solved your puzzle!",
 *     body: "They finished your {puzzle_type} in {solve_time}.",
 *   },
 *   data: { type: "craft_solved", navigate: "/craft" }
 * }
 */

/**
 * TRIGGER 3: New craft puzzle received
 * Fire when a new row is inserted into shared_puzzles for this user.
 *
 * Payload:
 * {
 *   to: "<recipient's APNs token>",
 *   notification: {
 *     title: "{sender_name} made you a puzzle!",
 *     body: "Tap to solve their {puzzle_type}.",
 *   },
 *   data: { type: "craft_received", navigate: "/craft", puzzle_id: "{id}" }
 * }
 */
