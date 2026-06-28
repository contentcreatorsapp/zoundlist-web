import type { CoverVariant } from "@/types/catalog";

export type RepeatMode = "none" | "all" | "one";

/** Minimal track shape the player needs — convertible from Track or ProducerTrack */
export interface PlayerTrack {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;         // required — callers must only create PlayerTrack when URL exists
  cover: CoverVariant;
  coverImage: string | null;
  duration: string;         // formatted "3:45"
  albumId?: string | null;
}

export interface PlayerState {
  track: PlayerTrack | null;
  queue: PlayerTrack[];
  queueIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  hasError: boolean;
  currentTime: number;
  duration: number;
  volume: number;           // 0–1
  muted: boolean;
  shuffle: boolean;
  shuffledIndices: number[];
  repeat: RepeatMode;
  showQueue: boolean;
}

export interface PlayerActions {
  playTrack(track: PlayerTrack, queue?: PlayerTrack[]): void;
  playAlbum(tracks: PlayerTrack[], startIndex?: number): void;
  pause(): void;
  resume(): void;
  togglePlay(): void;
  next(): void;
  previous(): void;
  seek(seconds: number): void;
  setVolume(value: number): void;
  toggleMute(): void;
  toggleShuffle(): void;
  toggleRepeat(): void;
  addToQueue(track: PlayerTrack): void;
  playNext(track: PlayerTrack): void;
  removeFromQueue(index: number): void;
  reorderQueue(from: number, to: number): void;
  clearQueue(): void;
  toggleQueue(): void;
}

export type PlayerContextValue = PlayerState & PlayerActions;
