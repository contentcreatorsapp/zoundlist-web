import type { CoverVariant } from "@/types/catalog";

export interface EditorialPlaylist {
  id: string;
  title: string;
  description: string;
  /** OR logic: any of these genre slugs qualifies a track */
  genreSlugs: string[];
  /** OR logic: any of these keywords (case-insensitive partial match on track.mood) */
  moodKeywords: string[];
  coverVariant: CoverVariant;
  /** Admin-curated image. null = use coverVariant gradient. */
  coverImage: string | null;
}

/**
 * Architecture hook for Zoundlist Originals internal label.
 * Flip enabled: true + populate tracks with an "originals" tag when ready.
 */
export interface OriginalsConfig {
  enabled: boolean;
  labelName: string;
  tagline: string;
  comingSoonText: string;
}
