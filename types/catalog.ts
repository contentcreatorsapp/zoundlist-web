// Shared catalog types — used across services, server and client components.

export type CoverVariant =
  | "violet" | "lime" | "orange" | "magenta" | "teal" | "gold" | "ice" | "ember";

export interface Track {
  id: string;
  title: string;
  artist: string;
  genre: string;        // genre slug
  mood: string;         // display label, e.g. "Épico"
  cover: CoverVariant;
  glyph: string;
  bpm: number;
  duration: string;
  audioUrl: string | null;
  featured: boolean;
  trending: boolean;
  staffPick: boolean;
  staffHero: boolean;
  isNew: boolean;
  staffNote: string | null;
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
