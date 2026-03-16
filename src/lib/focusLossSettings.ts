const KEY = "private_focus_loss_enabled";

export function getFocusLossEnabled(): boolean {
  try {
    const val = localStorage.getItem(KEY);
    if (val === null) return true; // default on
    return val === "1";
  } catch {
    return true;
  }
}

export function setFocusLossEnabled(enabled: boolean): void {
  localStorage.setItem(KEY, enabled ? "1" : "0");
}
