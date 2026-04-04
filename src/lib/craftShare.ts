export type CraftType = "word-fill" | "cryptogram" | "crossword" | "word-search";

export interface CraftPuzzleSettings {
  difficulty?: "easy" | "medium" | "hard" | "extreme" | "insane";
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
  theme?: string; // theme ID from craftThemes.ts
}

const CRAFT_HANDOFF_KEY = "craft_message_handoff";
const PUBLISHED_APP_URL = "https://puzzlecraft-lab.lovable.app";

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return atob(padded);
}

const TYPE_LABELS: Record<CraftType, string> = {
  "word-search": "Word Search",
  "word-fill": "Word Fill-In",
  crossword: "Crossword",
  cryptogram: "Cryptogram",
};

const TYPE_EMOJIS: Record<CraftType, string> = {
  "word-search": "🔍",
  "word-fill": "📝",
  crossword: "✏️",
  cryptogram: "🔐",
};

/**
 * Build personalized share text for sending a puzzle.
 * Includes puzzle type, title, and optional challenge time.
 */
export function buildCraftShareText(
  title?: string,
  from?: string,
  url?: string,
  type?: CraftType,
  creatorSolveTime?: number | null
): string {
  const emoji = type ? TYPE_EMOJIS[type] : "🧩";
  const label = type ? TYPE_LABELS[type] : "Puzzle";

  let headline: string;
  if (title?.trim()) {
    headline = `${emoji} ${title.trim()}`;
  } else if (from?.trim()) {
    headline = `${emoji} ${from.trim()} made you a ${label}`;
  } else {
    headline = `${emoji} Someone made you a ${label}`;
  }

  let challengeLine = "";
  if (creatorSolveTime && creatorSolveTime > 0) {
    const mins = Math.floor(creatorSolveTime / 60);
    const secs = creatorSolveTime % 60;
    const timeStr = mins > 0
      ? `${mins}:${secs.toString().padStart(2, "0")}`
      : `${secs}s`;
    challengeLine = `\nI solved it in ${timeStr} — can you beat me?`;
  }

  const urlLine = url ? `\n${url}` : "";

  return `${headline}${challengeLine}${urlLine}`;
}

/**
 * Build personalized share text for a recipient who just solved a puzzle.
 * Used for the "share your result" feature on the solve completion screen.
 */
export function buildSolveResultShareText(
  title?: string,
  type?: CraftType,
  solveTime?: number,
  creatorSolveTime?: number | null,
  url?: string
): string {
  const emoji = type ? TYPE_EMOJIS[type] : "🧩";
  const label = type ? TYPE_LABELS[type] : "Puzzle";

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${sec.toString().padStart(2, "0")}` : `${sec}s`;
  };

  const puzzleName = title?.trim() || label;
  const timeLine = solveTime ? ` in ${formatTime(solveTime)}` : "";

  let beatLine = "";
  if (creatorSolveTime && solveTime) {
    if (solveTime < creatorSolveTime) {
      const diff = creatorSolveTime - solveTime;
      beatLine = ` — ${formatTime(diff)} faster than the creator! 🏆`;
    } else if (solveTime === creatorSolveTime) {
      beatLine = " — exactly tied with the creator!";
    } else {
      beatLine = " — try again to beat the creator!";
    }
  }

  const urlLine = url ? `\nThink you can beat it? ${url}` : "";

  return `${emoji} I solved "${puzzleName}"${timeLine}${beatLine}${urlLine}`;
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
