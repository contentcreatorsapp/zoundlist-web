import type { PlayerTrack, RepeatMode } from "./types";

const KEY = "zl_player_v1";

export interface PersistedPlayer {
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  track: PlayerTrack | null;
  currentTime: number;
  queue: PlayerTrack[];
  queueIndex: number;
}

export function loadPlayer(): Partial<PersistedPlayer> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Partial<PersistedPlayer>) : {};
  } catch {
    return {};
  }
}

export function savePlayer(patch: Partial<PersistedPlayer>): void {
  if (typeof window === "undefined") return;
  try {
    const current = loadPlayer();
    localStorage.setItem(KEY, JSON.stringify({ ...current, ...patch }));
  } catch {}
}
