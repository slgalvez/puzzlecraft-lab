/** Minimal chat theme storage — bubble accent color */
const STORAGE_KEY = "private_chat_theme";
const CUSTOM_COLOR_KEY = "private_chat_custom_color";

export const CHAT_THEMES = [
  { id: "default", label: "Teal", hue: "172 50% 45%" },
  { id: "blue", label: "Blue", hue: "210 70% 50%" },
  { id: "purple", label: "Purple", hue: "270 60% 55%" },
  { id: "pink", label: "Pink", hue: "330 65% 55%" },
  { id: "green", label: "Green", hue: "150 55% 42%" },
  { id: "orange", label: "Orange", hue: "28 80% 52%" },
] as const;

export type ChatThemeId = (typeof CHAT_THEMES)[number]["id"] | "custom";

export function getChatTheme(): ChatThemeId {
  return (localStorage.getItem(STORAGE_KEY) as ChatThemeId) || "default";
}

export function getCustomColor(): string {
  return localStorage.getItem(CUSTOM_COLOR_KEY) || "#3b82f6";
}

export function setCustomColor(hex: string) {
  localStorage.setItem(CUSTOM_COLOR_KEY, hex);
  localStorage.setItem(STORAGE_KEY, "custom");
  applyChatTheme("custom");
}

export function setChatTheme(id: ChatThemeId) {
  localStorage.setItem(STORAGE_KEY, id);
  applyChatTheme(id);
}

/** Convert hex (#rrggbb) to HSL string "H S% L%" */
export function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return `0 0% ${Math.round(l * 100)}%`;

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Determine if text on a given HSL background should be light or dark */
export function foregroundForHsl(hsl: string): string {
  const parts = hsl.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return "0 0% 100%";
  const l = parseFloat(parts[2]);
  // Light backgrounds get dark text, dark backgrounds get light text
  return l > 55 ? "220 14% 10%" : "0 0% 100%";
}

export function applyChatTheme(id?: ChatThemeId) {
  const themeId = id || getChatTheme();
  let hsl: string;

  if (themeId === "custom") {
    hsl = hexToHsl(getCustomColor());
  } else {
    const theme = CHAT_THEMES.find((t) => t.id === themeId);
    if (!theme) return;
    hsl = theme.hue;
  }

  const fg = foregroundForHsl(hsl);

  // Apply to .private-app (desktop sidebar lives here)
  const el = document.querySelector(".private-app") as HTMLElement | null;
  if (el) {
    applyVarsToElement(el, hsl, fg);
  }

  // Apply to <body> so ALL portals (mobile sidebar sheet, dialogs, etc.)
  // rendered outside .private-app inherit the themed vars.
  // Scoped via the CSS selector `body:has(.private-app)` so public pages are unaffected.
  if (document.querySelector(".private-app")) {
    applyVarsToElement(document.body, hsl, fg);
  }
}

function applyVarsToElement(el: HTMLElement, hsl: string, fg: string) {
  el.style.setProperty("--primary", hsl);
  el.style.setProperty("--primary-foreground", fg);
  el.style.setProperty("--accent", hsl);
  el.style.setProperty("--ring", hsl);
  el.style.setProperty("--sidebar-primary", hsl);
  el.style.setProperty("--sidebar-primary-foreground", fg);
  el.style.setProperty("--sidebar-ring", hsl);
}
