import { createClient } from "@/lib/supabase/server";
import type { CoverVariant } from "@/types/catalog";

export interface Album {
  id: string;
  title: string;
  artist: string | null;
  description: string | null;
  coverImage: string | null;
  cover: CoverVariant;
  glyph: string;
  genreSlug: string | null;
  mood: string | null;
  uploaderId: string | null;
  published: boolean;
  releaseDate: string | null;
  createdAt: string | null;
  trackCount: number;
  downloadCount: number;
}

export interface AlbumTrack {
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
  downloadCount: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapAlbum(r: any, trackCount = 0, downloadCount = 0): Album {
  return {
    id: r.id,
    title: r.title,
    artist: r.artist ?? null,
    description: r.description ?? null,
    coverImage: r.cover_image ?? null,
    cover: (r.cover ?? "violet") as CoverVariant,
    glyph: r.glyph ?? "🎵",
    genreSlug: r.genre_slug ?? null,
    mood: r.mood ?? null,
    uploaderId: r.uploader_id ?? null,
    published: !!r.published,
    releaseDate: r.release_date ?? null,
    createdAt: r.created_at ?? null,
    trackCount,
    downloadCount,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Current producer's albums with track + download counts. */
export async function getMyAlbums(): Promise<Album[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: albums } = await supabase
    .from("albums")
    .select("*")
    .eq("uploader_id", user.id)
    .order("sort_order", { ascending: false });

  if (!albums || albums.length === 0) return [];

  const albumIds = albums.map((a: any) => a.id); /* eslint-disable-line @typescript-eslint/no-explicit-any */

  const { data: tracks } = await supabase
    .from("tracks")
    .select("id, album_id")
    .in("album_id", albumIds);

  const trackIds = (tracks ?? []).map((t: any) => t.id); /* eslint-disable-line @typescript-eslint/no-explicit-any */

  const { data: downloads } = trackIds.length > 0
    ? await supabase.from("downloads").select("track_id").in("track_id", trackIds)
    : { data: [] };

  const tracksByAlbum: Record<string, number> = {};
  const downloadsByAlbum: Record<string, number> = {};

  (tracks ?? []).forEach((t: any) => { /* eslint-disable-line @typescript-eslint/no-explicit-any */
    if (t.album_id) tracksByAlbum[t.album_id] = (tracksByAlbum[t.album_id] ?? 0) + 1;
  });

  (downloads ?? []).forEach((d: any) => { /* eslint-disable-line @typescript-eslint/no-explicit-any */
    const track = (tracks ?? []).find((t: any) => t.id === d.track_id); /* eslint-disable-line @typescript-eslint/no-explicit-any */
    if (track?.album_id) downloadsByAlbum[track.album_id] = (downloadsByAlbum[track.album_id] ?? 0) + 1;
  });

  return albums.map((a: any) => mapAlbum(a, tracksByAlbum[a.id] ?? 0, downloadsByAlbum[a.id] ?? 0)); /* eslint-disable-line @typescript-eslint/no-explicit-any */
}

/** Single album with its tracks — for the album detail page. */
export async function getAlbumWithTracks(albumId: string): Promise<{ album: Album; tracks: AlbumTrack[] } | null> {
  const supabase = await createClient();

  const { data: albumRow } = await supabase
    .from("albums")
    .select("*")
    .eq("id", albumId)
    .maybeSingle();

  if (!albumRow) return null;

  const { data: trackRows } = await supabase
    .from("tracks")
    .select("*")
    .eq("album_id", albumId)
    .order("sort_order", { ascending: true });

  const trackIds = (trackRows ?? []).map((t: any) => t.id); /* eslint-disable-line @typescript-eslint/no-explicit-any */
  const { data: downloads } = trackIds.length > 0
    ? await supabase.from("downloads").select("track_id").in("track_id", trackIds)
    : { data: [] };

  const dlCounts: Record<string, number> = {};
  (downloads ?? []).forEach((d: any) => { dlCounts[d.track_id] = (dlCounts[d.track_id] ?? 0) + 1; }); /* eslint-disable-line @typescript-eslint/no-explicit-any */

  const tracks: AlbumTrack[] = (trackRows ?? []).map((r: any) => ({ /* eslint-disable-line @typescript-eslint/no-explicit-any */
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
    downloadCount: dlCounts[r.id] ?? 0,
  }));

  return { album: mapAlbum(albumRow, tracks.length, Object.values(dlCounts).reduce((a, b) => a + b, 0)), tracks };
}

/** Public albums for an artist — used on /artistas/[slug]. */
export async function getArtistAlbums(uploaderId: string): Promise<Album[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("albums")
    .select("*")
    .eq("uploader_id", uploaderId)
    .eq("published", true)
    .order("sort_order", { ascending: false });

  return (data ?? []).map((a: any) => mapAlbum(a)); /* eslint-disable-line @typescript-eslint/no-explicit-any */
}
