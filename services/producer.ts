import { createClient } from "@/lib/supabase/server";
import type { CoverVariant, ProcessingStatus } from "@/types/catalog";

export interface ProducerTrack {
  id: string;
  title: string;
  artist: string;
  genre: string;
  mood: string;
  cover: CoverVariant;
  coverImage: string | null;
  glyph: string;
  bpm: number;
  duration: string;
  audioUrl: string | null;
  published: boolean;
  isNew: boolean;
  featured: boolean;
  downloadCount: number;
  createdAt: string | null;
  albumId: string | null;

  // Extended metadata
  subgenre: string | null;
  musicalKey: string | null;
  energy: number | null;
  instruments: string[];
  tags: string[];
  recommendedUses: string[];
  description: string | null;

  // Technical
  durationSecs: number | null;
  fileFormat: string | null;
  bitrate: number | null;
  sampleRate: number | null;
  channels: number | null;
  fileSize: number | null;
  storagePath: string | null;
  processingStatus: ProcessingStatus | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapRow(r: any, downloadCounts: Record<string, number>): ProducerTrack {
  return {
    id: r.id,
    title: r.title,
    artist: r.artist,
    genre: r.genre_slug,
    mood: r.mood,
    cover: r.cover as CoverVariant,
    coverImage: r.cover_image ?? null,
    glyph: r.glyph ?? "🎵",
    bpm: r.bpm ?? 0,
    duration: r.duration ?? "",
    audioUrl: r.audio_path ?? null,
    published: !!r.published,
    isNew: !!r.is_new,
    featured: !!r.featured,
    downloadCount: downloadCounts[r.id] ?? 0,
    createdAt: r.created_at ?? null,
    albumId: r.album_id ?? null,

    subgenre: r.subgenre ?? null,
    musicalKey: r.musical_key ?? null,
    energy: r.energy ?? null,
    instruments: r.instruments ?? [],
    tags: r.tags ?? [],
    recommendedUses: r.recommended_uses ?? [],
    description: r.description ?? null,

    durationSecs: r.duration_secs ?? null,
    fileFormat: r.file_format ?? null,
    bitrate: r.bitrate ?? null,
    sampleRate: r.sample_rate ?? null,
    channels: r.channels ?? null,
    fileSize: r.file_size ?? null,
    storagePath: r.storage_path ?? null,
    processingStatus: r.processing_status ?? null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Server-side: returns the current producer's tracks with download counts. */
export async function getMyTracksWithStats(): Promise<ProducerTrack[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: tracks } = await supabase
    .from("tracks")
    .select("*")
    .eq("uploader_id", user.id)
    .order("sort_order", { ascending: false });

  if (!tracks || tracks.length === 0) return [];

  const trackIds = tracks.map((t: any) => t.id); /* eslint-disable-line @typescript-eslint/no-explicit-any */
  const { data: downloads } = await supabase
    .from("downloads")
    .select("track_id")
    .in("track_id", trackIds);

  const counts: Record<string, number> = {};
  (downloads ?? []).forEach((d: any) => { /* eslint-disable-line @typescript-eslint/no-explicit-any */
    counts[d.track_id] = (counts[d.track_id] ?? 0) + 1;
  });

  return tracks.map((r: any) => mapRow(r, counts)); /* eslint-disable-line @typescript-eslint/no-explicit-any */
}

/** Single track by ID — only returns if owned by current user. */
export async function getMyTrackById(trackId: string): Promise<ProducerTrack | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("tracks")
    .select("*")
    .eq("id", trackId)
    .eq("uploader_id", user.id)
    .maybeSingle();

  if (!data) return null;
  return mapRow(data, {}); /* eslint-disable-line @typescript-eslint/no-explicit-any */
}

/** Public: returns published tracks for an artist by their profile id. */
export async function getArtistPublicTracks(uploaderId: string): Promise<ProducerTrack[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tracks")
    .select("*")
    .eq("uploader_id", uploaderId)
    .eq("published", true)
    .order("sort_order", { ascending: false });

  return (data ?? []).map((r: any) => mapRow(r, {})); /* eslint-disable-line @typescript-eslint/no-explicit-any */
}
