export type CraftType = "word-fill" | "cryptogram" | "crossword" | "word-search";

export interface CraftPuzzleSettings {
  difficulty?: "easy" | "medium" | "hard";
  hintsEnabled?: boolean;
  revealEnabled?: boolean;
  checkEnabled?: boolean;
}

export interface CraftPayload {
  type: CraftType;
  puzzleData: Record<string, unknown>;
  revealMessage: string;
  title?: string;
  from?: string;
  settings?: CraftPuzzleSettings;
}

const CRAFT_HANDOFF_KEY = "craft_message_handoff";
const PUBLISHED_APP_URL = "https://puzzlecraft-lab.lovable.app";

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return atob(padded);
}

export function buildCraftShareText(title?: string, from?: string, url?: string): string {
  const lines: string[] = [];

  if (title) lines.push(`For ${title}`);
  if (from) lines.push(`From — ${from}`);
  if (lines.length > 0) lines.push("");
  lines.push("I made you a puzzle");
  if (url) {
    lines.push("Solve it here:");
    lines.push(url);
  }

  return lines.join("\n");
}

export function isPrivateSessionAvailable(): boolean {
  try {
    const raw = localStorage.getItem("private_session");
    if (!raw) return false;

    const parsed = JSON.parse(raw) as { token?: string };
    const payloadB64 = parsed.token?.split(".")?.[1];
    if (!payloadB64) return false;

    const payload = JSON.parse(decodeBase64Url(payloadB64)) as { exp?: number };
    return !payload.exp || payload.exp >= Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function getCraftShareBaseUrl(): string {
  if (typeof window === "undefined") return PUBLISHED_APP_URL;

  const hostname = window.location.hostname;
  const isPreviewHost = hostname.includes("lovableproject.com") || hostname.includes("--");

  return isPreviewHost ? PUBLISHED_APP_URL : window.location.origin;
}

export function buildCraftShareUrl(id: string): string {
  return `${getCraftShareBaseUrl()}/s/${id}`;
}

export function saveCraftMessageHandoff(payload: CraftPayload) {
  sessionStorage.setItem(CRAFT_HANDOFF_KEY, JSON.stringify(payload));
}

export function takeCraftMessageHandoff(): CraftPayload | null {
  try {
    const raw = sessionStorage.getItem(CRAFT_HANDOFF_KEY);
    if (!raw) return null;

    sessionStorage.removeItem(CRAFT_HANDOFF_KEY);
    const parsed = JSON.parse(raw) as CraftPayload;

    if (!parsed?.type || !parsed?.puzzleData) return null;
    return parsed;
  } catch {
    sessionStorage.removeItem(CRAFT_HANDOFF_KEY);
    return null;
  }
}
