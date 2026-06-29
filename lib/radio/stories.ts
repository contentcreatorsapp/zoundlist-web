import type { TrackStory } from "./types";

/**
 * Static editorial stories for Radio.
 *
 * Migration path → Supabase:
 *   CREATE TABLE radio_stories (
 *     id          text PRIMARY KEY,
 *     track_id    uuid REFERENCES tracks(id),
 *     title       text NOT NULL,
 *     artist      text NOT NULL,
 *     story       text NOT NULL,
 *     image_url   text,          -- editorial photo (cinematic)
 *     cover_url   text,          -- album art
 *     cover_variant text NOT NULL DEFAULT 'teal',
 *     genre       text,
 *     published_at timestamptz DEFAULT now()
 *   );
 *
 * Once the table exists, replace this array with a server fetch in
 * app/radio/page.tsx:
 *   const { data: stories } = await supabase.from("radio_stories")
 *     .select("*").order("published_at", { ascending: false }).limit(5);
 */
export const RADIO_STORIES: TrackStory[] = [
  {
    id: "story-001",
    trackId: null, // set to a real track UUID to auto-link
    title: "Golden Hour",
    artist: "Zoundlist Originals",
    story:
      "Una pieza creada para esos momentos donde todo baja de velocidad. Texturas cálidas, una melodía sencilla y una sensación de pausa que acompaña sin interrumpir. No importa dónde estés — esta canción te recuerda que respirar también es parte del ritmo.",
    imageUrl: null, // replace with: https://[project].supabase.co/storage/v1/object/public/radio-stories/story-001/editorial.jpg
    coverUrl: null, // replace with: track.coverImage or a dedicated cover photo
    coverVariant: "orange",
    genre: "Cinematic",
  },
  {
    id: "story-002",
    trackId: null,
    title: "Deep Focus",
    artist: "Zoundlist Originals",
    story:
      "Cuando la mente necesita silencio para moverse rápido. Esta producción nació de noches largas y pantallas brillando en la oscuridad. Sin letra, sin distracción. Solo el flujo.",
    imageUrl: null,
    coverUrl: null,
    coverVariant: "teal",
    genre: "Lo-fi",
  },
];
