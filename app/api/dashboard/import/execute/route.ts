import { NextRequest, NextResponse } from "next/server";
import { createClient }       from "@/lib/supabase/server";
import { createAdminClient }  from "@/lib/supabase/admin";
import type { ImportedTrackMetadata } from "@/lib/music-import/types";

export const runtime     = "nodejs";
export const maxDuration = 60;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "track";
}

function fmtDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ── Parse body ────────────────────────────────────────────────────────────
  let metadata: ImportedTrackMetadata;
  let albumId: string | undefined;
  try {
    const body = await req.json();
    metadata = body?.metadata;
    albumId  = body?.albumId;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!metadata?.audioUrl) {
    return NextResponse.json({ error: "No hay URL de audio disponible para importar." }, { status: 400 });
  }

  const admin     = createAdminClient();
  const timestamp = Date.now();
  const titleSlug = slugify(metadata.title ?? "suno-track");
  const storagePath = `producers/${user.id}/suno/${timestamp}-${titleSlug}.mp3`;

  // ── 1. Download audio from source (server-side) ───────────────────────────
  let audioBuffer: ArrayBuffer;
  try {
    const audioRes = await fetch(metadata.audioUrl, {
      headers: { "User-Agent": "Zoundlist/1.0 (+https://zoundlist.com)" },
      signal: AbortSignal.timeout(50_000),
    });
    if (!audioRes.ok) throw new Error(`Audio fetch failed: ${audioRes.status}`);
    audioBuffer = await audioRes.arrayBuffer();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error descargando audio";
    return NextResponse.json({ error: "audio_download_failed", message: msg }, { status: 502 });
  }

  // ── 2. Upload audio to Supabase Storage ───────────────────────────────────
  const { error: storageErr } = await admin.storage
    .from("tracks")
    .upload(storagePath, audioBuffer, {
      contentType: "audio/mpeg",
      cacheControl: "3600",
      upsert: false,
    });
  if (storageErr) {
    return NextResponse.json({ error: "storage_upload_failed", message: storageErr.message }, { status: 500 });
  }
  const audioPublicUrl = admin.storage.from("tracks").getPublicUrl(storagePath).data.publicUrl;

  // ── 3. Download & upload cover art (non-fatal) ────────────────────────────
  let coverPublicUrl: string | null = null;
  if (metadata.coverUrl) {
    try {
      const coverRes = await fetch(metadata.coverUrl, { signal: AbortSignal.timeout(12_000) });
      if (coverRes.ok) {
        const coverBuf         = await coverRes.arrayBuffer();
        const contentType      = coverRes.headers.get("content-type") ?? "image/jpeg";
        const ext              = contentType.includes("png") ? "png" : "jpg";
        const coverStoragePath = `suno/${timestamp}-${titleSlug}.${ext}`;
        const { error: coverErr } = await admin.storage
          .from("covers")
          .upload(coverStoragePath, coverBuf, { contentType, cacheControl: "31536000", upsert: false });
        if (!coverErr) {
          coverPublicUrl = admin.storage.from("covers").getPublicUrl(coverStoragePath).data.publicUrl;
        }
      }
    } catch {
      // Cover failure is non-fatal; the user can add art via the edit page
    }
  }

  // ── 4. Unique slug ────────────────────────────────────────────────────────
  const baseSlug = `suno-${metadata.sourceId ?? titleSlug}`;
  let slug = baseSlug;
  const { data: existing } = await supabase
    .from("tracks").select("id").eq("slug", slug).maybeSingle();
  if (existing) slug = `${baseSlug}-${timestamp.toString(36)}`;

  // ── 5. Build description from available metadata ──────────────────────────
  const descParts: string[] = [];
  if (metadata.prompt)  descParts.push(`Prompt: ${metadata.prompt}`);
  if (metadata.lyrics)  descParts.push(`Lyrics:\n${metadata.lyrics.slice(0, 800)}`);
  descParts.push(`Imported from Suno · ${metadata.sourceUrl}`);
  const description = descParts.join("\n\n");

  // ── 6. Insert draft track ─────────────────────────────────────────────────
  const durationSecs = metadata.durationSecs ?? null;
  const row = {
    slug,
    title:            metadata.title ?? "Untitled (Suno)",
    artist:           metadata.artist ?? "Artista",
    genre_slug:       "cinematic",         // default — user reviews in edit page
    mood:             "Épico",             // default — user reviews in edit page
    cover:            "violet",
    cover_image:      coverPublicUrl,
    glyph:            "🎵",
    bpm:              null,
    duration:         durationSecs ? fmtDuration(durationSecs) : "0:00",
    duration_secs:    durationSecs,
    audio_path:       audioPublicUrl,
    storage_path:     storagePath,
    file_format:      "mp3",
    file_size:        audioBuffer.byteLength,
    instruments:      [] as string[],
    tags:             metadata.tags,
    recommended_uses: [] as string[],
    description,
    is_new:           true,
    published:        false,               // always draft — requires manual review
    processing_status: "ready",
    uploader_id:      user.id,
    album_id:         albumId ?? null,
    sort_order:       Math.floor(timestamp / 1000),
  };

  const { data: track, error: insertErr } = await supabase
    .from("tracks")
    .insert(row)
    .select("id")
    .maybeSingle();

  if (insertErr || !track) {
    // Rollback storage upload
    await admin.storage.from("tracks").remove([storagePath]);
    return NextResponse.json(
      { error: "track_create_failed", message: insertErr?.message ?? "DB insert failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, trackId: track.id });
}
