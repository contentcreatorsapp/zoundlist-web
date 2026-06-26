import type { Catalog, Track } from "@/types/catalog";

const STAFF_NOTE =
  "Texturas cálidas y un crescendo que respira. Funciona igual de bien en un reel de bodas que en el cierre de un documental.";

// Default flags so each track only declares what's true.
function t(p: Partial<Track> & Pick<Track, "id" | "title" | "artist" | "genre" | "mood" | "cover" | "glyph" | "bpm" | "duration">): Track {
  return {
    audioUrl: null, coverImage: null,
    featured: false, trending: false, staffPick: false, staffHero: false, isNew: false, staffNote: null,
    ...p,
  };
}

/**
 * Bundled catalog used as a fallback when Supabase is unconfigured or
 * unreachable. Mirrors `supabase/seed.sql` so dev and prod look identical.
 */
export const CATALOG_FALLBACK: Catalog = {
  tracks: [
    t({ id: "midnight-drive",   title: "Midnight Drive",   artist: "Cinematic", genre: "cinematic", mood: "Épico",        cover: "violet",  glyph: "🎬", bpm: 118, duration: "2:43", featured: true, trending: true }),
    t({ id: "golden-hour",      title: "Golden Hour",      artist: "Cinematic", genre: "cinematic", mood: "Nostálgico",   cover: "gold",    glyph: "🌅", bpm: 96,  duration: "3:20", featured: true, trending: true, staffPick: true, staffHero: true, staffNote: STAFF_NOTE }),
    t({ id: "heavens-gate",     title: "Heaven's Gate",    artist: "Worship",   genre: "worship",   mood: "Reverente",    cover: "ice",     glyph: "✨", bpm: 72,  duration: "4:02", featured: true, trending: true, staffPick: true }),
    t({ id: "morning-light",    title: "Morning Light",    artist: "Lo-fi",     genre: "lofi",      mood: "Tranquilo",    cover: "orange",  glyph: "☕", bpm: 84,  duration: "3:15", trending: true }),
    t({ id: "corporate-pulse",  title: "Corporate Pulse",  artist: "Corporate", genre: "corporate", mood: "Motivacional", cover: "teal",    glyph: "💼", bpm: 120, duration: "2:28", trending: true, staffPick: true }),
    t({ id: "reel-hook",        title: "Reel Hook",        artist: "Social",    genre: "social",    mood: "Energético",   cover: "magenta", glyph: "📱", bpm: 128, duration: "0:30", featured: true, trending: true }),
    t({ id: "deep-focus",       title: "Deep Focus",       artist: "Podcast",   genre: "podcast",   mood: "Concentrado",  cover: "violet",  glyph: "🎙️", bpm: 90,  duration: "3:40", staffPick: true }),
    t({ id: "lofi-rain",        title: "Lo-fi Rain",       artist: "Lo-fi",     genre: "lofi",      mood: "Melancólico",  cover: "ice",     glyph: "🌧️", bpm: 78,  duration: "2:55", isNew: true }),
    t({ id: "brand-launch",     title: "Brand Launch",     artist: "Corporate", genre: "corporate", mood: "Ambicioso",    cover: "ember",   glyph: "🚀", bpm: 126, duration: "2:10", featured: true, trending: true }),
    t({ id: "neon-skyline",     title: "Neon Skyline",     artist: "Cinematic", genre: "cinematic", mood: "Épico",        cover: "magenta", glyph: "🌃", bpm: 110, duration: "3:05", featured: true, trending: true, isNew: true }),
    t({ id: "quiet-sanctuary",  title: "Quiet Sanctuary",  artist: "Worship",   genre: "worship",   mood: "Reverente",    cover: "violet",  glyph: "🕊️", bpm: 68,  duration: "4:30", isNew: true }),
    t({ id: "late-study",       title: "Late Study",       artist: "Lo-fi",     genre: "lofi",      mood: "Tranquilo",    cover: "teal",    glyph: "📚", bpm: 80,  duration: "3:12", staffPick: true, isNew: true }),
  ],
  genres: [
    { slug: "cinematic", name: "Cinematic", glyph: "🎬", cover: "violet",  trackCount: 42 },
    { slug: "lofi",      name: "Lo-fi",     glyph: "🌧️", cover: "orange",  trackCount: 31 },
    { slug: "worship",   name: "Worship",   glyph: "✨", cover: "ice",     trackCount: 28 },
    { slug: "corporate", name: "Corporate", glyph: "💼", cover: "teal",    trackCount: 24 },
    { slug: "social",    name: "Social",    glyph: "📱", cover: "magenta", trackCount: 36 },
    { slug: "podcast",   name: "Podcast",   glyph: "🎙️", cover: "gold",    trackCount: 19 },
  ],
  moods: [
    { slug: "epico",        name: "Épico",        cover: "ember",   trackCount: 26 },
    { slug: "tranquilo",    name: "Tranquilo",    cover: "teal",    trackCount: 33 },
    { slug: "motivacional", name: "Motivacional", cover: "lime",    trackCount: 22 },
    { slug: "melancolico",  name: "Melancólico",  cover: "ice",     trackCount: 18 },
    { slug: "energetico",   name: "Energético",   cover: "magenta", trackCount: 29 },
    { slug: "reverente",    name: "Reverente",    cover: "violet",  trackCount: 15 },
  ],
};
