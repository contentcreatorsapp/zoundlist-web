import type { CoverVariant } from "@/types/catalog";

/**
 * Editorial story attached to a track.
 * Static for now — migrate to Supabase table `radio_stories` when ready.
 * Image fields accept Supabase Storage public URLs.
 */
export interface TrackStory {
  id: string;
  /** Catalog track ID. null = match by title/artist, then fallback to RADIO_STORIES[0]. */
  trackId: string | null;
  title: string;
  artist: string;
  /** 2-4 sentences. Replace with real producer/artist copy. */
  story: string;
  /**
   * Editorial image (cinematic photo, not album art).
   * Null = fall through to coverUrl → CINEMA[coverVariant].
   * Future: Supabase Storage URL (radio-stories/[id]/editorial.jpg)
   */
  imageUrl: string | null;
  /**
   * Album / track cover art.
   * Null = fall through to CINEMA[coverVariant].
   * Future: Supabase Storage URL or track.coverImage
   */
  coverUrl: string | null;
  /** Fallback gradient key when no image is available. */
  coverVariant: CoverVariant;
  /** Display label shown as a badge on the image. */
  genre: string | null;
}

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
