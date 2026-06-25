import { createClient } from "@supabase/supabase-js";
import type { Catalog, CoverVariant, Genre, Mood, Track } from "@/types/catalog";
import { CATALOG_FALLBACK } from "@/lib/catalog/seed";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Plain anon client (no cookies) — public catalog reads, cacheable via ISR.
function db() {
  return createClient(url!, key!);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapTrack(r: any): Track {
  return {
    id: r.id,
    title: r.title,
    artist: r.artist,
    genre: r.genre_slug,
    mood: r.mood,
    cover: r.cover as CoverVariant,
    glyph: r.glyph ?? "🎵",
    bpm: r.bpm ?? 0,
    duration: r.duration ?? "",
    featured: !!r.featured,
    trending: !!r.trending,
    staffPick: !!r.staff_pick,
    staffHero: !!r.staff_hero,
    isNew: !!r.is_new,
    staffNote: r.staff_note ?? null,
  };
}
function mapGenre(r: any): Genre {
  return { slug: r.slug, name: r.name, glyph: r.glyph ?? "🎵", cover: r.cover as CoverVariant, trackCount: r.track_count ?? 0 };
}
function mapMood(r: any): Mood {
  return { slug: r.slug, name: r.name, cover: r.cover as CoverVariant, trackCount: r.track_count ?? 0 };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Loads the public catalog from Supabase. Falls back to the bundled seed
 * if Supabase is unconfigured, errors, or returns no tracks — the home
 * page always renders something.
 */
export async function getCatalog(): Promise<Catalog> {
  if (!url || !key) return CATALOG_FALLBACK;

  try {
    const supabase = db();
    const [tracksRes, genresRes, moodsRes] = await Promise.all([
      supabase.from("tracks").select("*").eq("published", true).order("sort_order"),
      supabase.from("genres").select("*").order("sort_order"),
      supabase.from("moods").select("*").order("sort_order"),
    ]);

    if (tracksRes.error || genresRes.error || moodsRes.error) return CATALOG_FALLBACK;
    if (!tracksRes.data || tracksRes.data.length === 0) return CATALOG_FALLBACK;

    return {
      tracks: tracksRes.data.map(mapTrack),
      genres: (genresRes.data ?? []).map(mapGenre),
      moods: (moodsRes.data ?? []).map(mapMood),
    };
  } catch {
    return CATALOG_FALLBACK;
  }
}
