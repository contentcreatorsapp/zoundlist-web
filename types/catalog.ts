// Shared catalog types — used across services, server and client components.

export type CoverVariant =
  | "violet" | "lime" | "orange" | "magenta" | "teal" | "gold" | "ice" | "ember";

export type ProcessingStatus = "pending" | "analyzing" | "ready" | "error";

export interface Track {
  id: string;
  title: string;
  artist: string;
  genre: string;        // genre slug
  mood: string;         // display label, e.g. "Épico"
  cover: CoverVariant;
  coverImage: string | null;
  glyph: string;
  bpm: number;
  duration: string;     // formatted "3:45"
  audioUrl: string | null;
  featured: boolean;
  trending: boolean;
  staffPick: boolean;
  staffHero: boolean;
  isNew: boolean;
  staffNote: string | null;

  // Extended metadata (Phase 1)
  subgenre: string | null;
  musicalKey: string | null;
  energy: number | null;          // 1–10
  instruments: string[];
  tags: string[];
  recommendedUses: string[];
  description: string | null;

  // Technical audio info (Phase 2 — populated on upload)
  durationSecs: number | null;
  fileFormat: string | null;
  bitrate: number | null;
  sampleRate: number | null;
  channels: number | null;
  fileSize: number | null;
  storagePath: string | null;

  // Pipeline
  processingStatus: ProcessingStatus | null;
}

export interface Genre {
  slug: string;
  name: string;
  glyph: string;
  cover: CoverVariant;
  trackCount: number;
}

export interface Mood {
  slug: string;
  name: string;
  cover: CoverVariant;
  trackCount: number;
}

export interface Catalog {
  tracks: Track[];
  genres: Genre[];
  moods: Mood[];
}
