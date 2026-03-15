import { PersistedState } from "./audioPlayerTypes";

const STORAGE_KEY = "audio-player-state";

export function getPersistedState(): Partial<PersistedState> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error(
      "Failed to load audio player state from localStorage:",
      error
    );
  }

  return {};
}

export function savePersistedState(state: PersistedState): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error(
      "Failed to save audio player state to localStorage:",
      error
    );
  }
}

export function clearPersistedState(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
