/** Saved location labels (Home, Work, etc.) stored in localStorage */

export interface LocationLabel {
  id: string;
  name: string;
  icon: string; // emoji
  lat: number;
  lng: number;
}

const STORAGE_KEY = "location-labels";

const DEFAULT_ICONS = ["🏠", "💼", "🏫", "🏥", "☕", "🏋️", "⭐"];

export function getDefaultIcons(): string[] {
  return DEFAULT_ICONS;
}

export function getLocationLabels(): LocationLabel[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocationLabel(label: LocationLabel): void {
  const labels = getLocationLabels();
  const idx = labels.findIndex((l) => l.id === label.id);
  if (idx >= 0) labels[idx] = label;
  else labels.push(label);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(labels));
}

export function deleteLocationLabel(id: string): void {
  const labels = getLocationLabels().filter((l) => l.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(labels));
}