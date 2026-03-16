import { invokeMessaging } from "@/lib/privateApi";

/** Get focus loss setting from the stored user session */
export function getFocusLossEnabled(): boolean {
  try {
    const raw = localStorage.getItem("private_session");
    if (!raw) return true;
    const { user } = JSON.parse(raw);
    return user?.focus_loss_protection !== false; // default true
  } catch {
    return true;
  }
}

/** Update focus loss setting in DB and local session */
export async function setFocusLossEnabled(enabled: boolean, token: string): Promise<void> {
  // Update local session immediately for responsive UI
  try {
    const raw = localStorage.getItem("private_session");
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.user.focus_loss_protection = enabled;
      localStorage.setItem("private_session", JSON.stringify(parsed));
    }
  } catch {}

  // Persist to DB
  await invokeMessaging("update-settings", token, { focus_loss_protection: enabled });
}
