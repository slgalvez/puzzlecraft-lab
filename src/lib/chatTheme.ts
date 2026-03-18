/** Minimal chat theme storage — bubble accent color */
const STORAGE_KEY = "private_chat_theme";

export const CHAT_THEMES = [
  { id: "default", label: "Teal", hue: "172 50% 45%" },
  { id: "blue", label: "Blue", hue: "210 70% 50%" },
  { id: "purple", label: "Purple", hue: "270 60% 55%" },
  { id: "pink", label: "Pink", hue: "330 65% 55%" },
  { id: "green", label: "Green", hue: "150 55% 42%" },
  { id: "orange", label: "Orange", hue: "28 80% 52%" },
] as const;

export type ChatThemeId = (typeof CHAT_THEMES)[number]["id"];

export function getChatTheme(): ChatThemeId {
  return (localStorage.getItem(STORAGE_KEY) as ChatThemeId) || "default";
}

export function setChatTheme(id: ChatThemeId) {
  localStorage.setItem(STORAGE_KEY, id);
  applyChatTheme(id);
}

export function applyChatTheme(id?: ChatThemeId) {
  const theme = CHAT_THEMES.find((t) => t.id === (id || getChatTheme()));
  if (!theme) return;
  const el = document.querySelector(".private-app") as HTMLElement | null;
  if (!el) return;
  el.style.setProperty("--primary", theme.hue);
  el.style.setProperty("--accent", theme.hue);
  el.style.setProperty("--ring", theme.hue);
  el.style.setProperty("--sidebar-primary", theme.hue);
  el.style.setProperty("--sidebar-ring", theme.hue);
}
