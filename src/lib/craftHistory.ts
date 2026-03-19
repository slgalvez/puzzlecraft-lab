import type { CraftType, CraftPuzzleSettings } from "@/lib/craftShare";

/* ── Types ── */

export interface CraftDraft {
  id: string;
  type: CraftType;
  title: string;
  from: string;
  wordInput: string;
  phraseInput: string;
  clueEntries: { answer: string; clue: string }[];
  revealMessage: string;
  settings?: CraftPuzzleSettings;
  updatedAt: number; // epoch ms
}

export interface CraftSentItem {
  id: string;
  shareId: string;
  type: CraftType;
  title: string;
  from: string;
  revealMessage: string;
  shareUrl: string;
  sentAt: number; // epoch ms
}

/* ── Constants ── */

const DRAFTS_KEY = "puzzlecraft-craft-drafts";
const SENT_KEY = "puzzlecraft-craft-sent";
const MAX_DRAFTS = 20;
const MAX_SENT = 50;

/* ── Helpers ── */

function readJson<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeJson<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function generateDraftId(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ── Drafts ── */

export function loadDrafts(): CraftDraft[] {
  return readJson<CraftDraft>(DRAFTS_KEY).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function loadDraft(id: string): CraftDraft | undefined {
  return readJson<CraftDraft>(DRAFTS_KEY).find((d) => d.id === id);
}

export function saveDraft(draft: CraftDraft) {
  const drafts = readJson<CraftDraft>(DRAFTS_KEY).filter((d) => d.id !== draft.id);
  drafts.unshift(draft);
  writeJson(DRAFTS_KEY, drafts.slice(0, MAX_DRAFTS));
}

export function deleteDraft(id: string) {
  writeJson(DRAFTS_KEY, readJson<CraftDraft>(DRAFTS_KEY).filter((d) => d.id !== id));
}

/* ── Sent ── */

export function loadSentItems(): CraftSentItem[] {
  return readJson<CraftSentItem>(SENT_KEY).sort((a, b) => b.sentAt - a.sentAt);
}

export function addSentItem(item: CraftSentItem) {
  const items = readJson<CraftSentItem>(SENT_KEY);
  items.unshift(item);
  writeJson(SENT_KEY, items.slice(0, MAX_SENT));
}

export function deleteSentItem(id: string) {
  writeJson(SENT_KEY, readJson<CraftSentItem>(SENT_KEY).filter((s) => s.id !== id));
}

/* ── Relative time ── */

export function relativeTime(epochMs: number): string {
  const diff = Date.now() - epochMs;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(epochMs).toLocaleDateString();
}
