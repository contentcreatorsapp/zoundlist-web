import type { EditorialPlaylist, OriginalsConfig } from "./types";

/**
 * Flip enabled to true when Zoundlist Originals tracks are in the catalog.
 * No other code changes required — the Radio page reads this config.
 */
export const ORIGINALS_CONFIG: OriginalsConfig = {
  enabled: false,
  labelName: "Zoundlist Originals",
  tagline: "Exclusivo. Primero aquí.",
  comingSoonText: "Producciones originales de Zoundlist llegan pronto. Sé el primero en escucharlas.",
};

/**
 * Static editorial playlists. Structured so they can later be replaced
 * by a Supabase query (same shape as the DB row would have).
 *
 * Track selection: OR(genre match, mood keyword match) so playlists
 * are populated even when the catalog is small.
 */
export const EDITORIAL_PLAYLISTS: EditorialPlaylist[] = [
  {
    id: "coffee-break",
    title: "Coffee Break",
    description: "Tranquilo, suave. Perfecto para concentrarte.",
    genreSlugs: ["lofi", "podcast"],
    moodKeywords: ["tranquilo", "concentrado"],
    coverVariant: "orange",
    coverImage: null,
  },
  {
    id: "late-night",
    title: "Late Night",
    description: "Para las horas donde todo se siente diferente.",
    genreSlugs: ["cinematic"],
    moodKeywords: ["melancólico", "melancolico"],
    coverVariant: "violet",
    coverImage: null,
  },
  {
    id: "motivation",
    title: "Motivation",
    description: "Cuando necesitas más que cafeína.",
    genreSlugs: ["corporate"],
    moodKeywords: ["motivacional", "ambicioso"],
    coverVariant: "teal",
    coverImage: null,
  },
  {
    id: "driving",
    title: "Driving",
    description: "Soundtrack para kilómetros que desaparecen.",
    genreSlugs: ["cinematic", "social"],
    moodKeywords: ["energético", "energetico", "épico", "epico"],
    coverVariant: "ember",
    coverImage: null,
  },
  {
    id: "espiritual",
    title: "Espiritual",
    description: "Para los momentos que piden pausa y presencia.",
    genreSlugs: ["worship"],
    moodKeywords: ["reverente"],
    coverVariant: "ice",
    coverImage: null,
  },
  {
    id: "cinematic",
    title: "Cinematic",
    description: "Cada frame tiene su soundtrack aquí.",
    genreSlugs: ["cinematic"],
    moodKeywords: ["épico", "epico"],
    coverVariant: "magenta",
    coverImage: null,
  },
  {
    id: "lofi-sessions",
    title: "Lo-Fi Sessions",
    description: "Beats que respiran mientras trabajas.",
    genreSlugs: ["lofi"],
    moodKeywords: ["tranquilo", "melancólico"],
    coverVariant: "gold",
    coverImage: null,
  },
  {
    id: "vibras-del-dia",
    title: "Vibras del día",
    description: "Energía que se contagia. Para hacer el día tuyo.",
    genreSlugs: ["corporate", "social"],
    moodKeywords: ["motivacional", "energético", "energetico"],
    coverVariant: "lime",
    coverImage: null,
  },
  {
    id: "ambiente",
    title: "Ambiente",
    description: "El fondo perfecto. Sin distracciones, solo fluir.",
    genreSlugs: ["podcast"],
    moodKeywords: ["tranquilo", "concentrado"],
    coverVariant: "teal",
    coverImage: null,
  },
];
