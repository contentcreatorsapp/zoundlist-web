import { NextRequest, NextResponse } from "next/server";
import { getUserFromExtensionRequest, createUserSupabase, CORS_HEADERS } from "@/lib/supabase/extension-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ImportedTrackMetadata } from "@/lib/music-import/types";

export const runtime     = "nodejs";
export const maxDuration = 60;

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "track";
}
function fmtDuration(secs: number): string {
  const m = Math.floor(secs / 60), s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const user = await getUserFromExtensionRequest(req);
  if (!user || !token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  // ── Body ────────────────────────────────────────────────────────────────────
  let metadata: ImportedTrackMetadata, albumId: string | undefined,
      preferWav = false, wavUrl: string | null = null;
  try {
    const body = await req.json();
    metadata  = body.metadata;
    albumId   = body.albumId;
    preferWav = !!body.preferWav;
    wavUrl    = body.wavUrl ?? null;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400, headers: CORS_HEADERS });
  }

  const effectiveAudioUrl = (preferWav && wavUrl) ? wavUrl : metadata?.audioUrl;
  if (!effectiveAudioUrl) {
    return NextResponse.json(
      { error: "No hay URL de audio disponible." }, { status: 400, headers: CORS_HEADERS }
    );
  }

  const isWav      = preferWav && !!wavUrl;
  const ext        = isWav ? "wav" : "mp3";
  const mime       = isWav ? "audio/wav" : "audio/mpeg";
  const admin      = createAdminClient();
  const supabase   = createUserSupabase(token);
  const timestamp  = Date.now();
  const titleSlug  = slugify(metadata.title ?? "suno-track");
  const storagePath = `producers/${user.id}/suno/${timestamp}-${titleSlug}.${ext}`;

  // ── 1. Download audio ────────────────────────────────────────────────────────
  let audioBuffer: ArrayBuffer;
  try {
    const res = await fetch(effectiveAudioUrl, {
      headers: { "User-Agent": "Zoundlist/1.0 (+https://zoundlist.com)" },
      signal: AbortSignal.timeout(50_000),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    audioBuffer = await res.arrayBuffer();

    // If WAV failed, fallback to mp3
    if (isWav && audioBuffer.byteLength < 1000) throw new Error("WAV response too small");
  } catch (err) {
    if (isWav && metadata.audioUrl) {
      // Fallback to mp3
      try {
        const r2 = await fetch(metadata.audioUrl, {
          headers: { "User-Agent": "Zoundlist/1.0" },
          signal: AbortSignal.timeout(50_000),
        });
        if (!r2.ok) throw new Error(`mp3 fallback ${r2.status}`);
        audioBuffer = await r2.arrayBuffer();
      } catch (err2) {
        const msg = err2 instanceof Error ? err2.message : "Error descargando audio";
        return NextResponse.json(
          { error: "audio_download_failed", message: msg }, { status: 502, headers: CORS_HEADERS }
        );
      }
    } else {
      const msg = err instanceof Error ? err.message : "Error descargando audio";
      return NextResponse.json(
        { error: "audio_download_failed", message: msg }, { status: 502, headers: CORS_HEADERS }
      );
    }
  }

  // Final format (might have fallen back to mp3)
  const finalExt  = isWav ? "wav" : "mp3";
  const finalMime = isWav ? "audio/wav" : "audio/mpeg";
  const finalPath = isWav ? storagePath : storagePath.replace(".wav", ".mp3");

  // ── 2. Upload audio to Storage ───────────────────────────────────────────────
  const { error: storageErr } = await admin.storage.from("tracks").upload(finalPath, audioBuffer, {
    contentType: finalMime, cacheControl: "3600", upsert: false,
  });
  if (storageErr) {
    return NextResponse.json(
      { error: "storage_upload_failed", message: storageErr.message }, { status: 500, headers: CORS_HEADERS }
    );
  }
  const audioPublicUrl = admin.storage.from("tracks").getPublicUrl(finalPath).data.publicUrl;

  // ── 3. Cover art (non-fatal) ─────────────────────────────────────────────────
  let coverPublicUrl: string | null = null;
  if (metadata.coverUrl) {
    try {
      const cr = await fetch(metadata.coverUrl, { signal: AbortSignal.timeout(12_000) });
      if (cr.ok) {
        const cb = await cr.arrayBuffer();
        const ct = cr.headers.get("content-type") ?? "image/jpeg";
        const ce = ct.includes("png") ? "png" : "jpg";
        const cp = `suno/${timestamp}-${titleSlug}.${ce}`;
        const { error: ce2 } = await admin.storage.from("covers").upload(cp, cb, {
          contentType: ct, cacheControl: "31536000", upsert: false,
        });
        if (!ce2) coverPublicUrl = admin.storage.from("covers").getPublicUrl(cp).data.publicUrl;
      }
    } catch { /* non-fatal */ }
  }

  // ── 4. Unique slug ───────────────────────────────────────────────────────────
  const baseSlug = `suno-${metadata.sourceId ?? titleSlug}`;
  let slug = baseSlug;
  const { data: existing } = await supabase.from("tracks").select("id").eq("slug", slug).maybeSingle();
  if (existing) slug = `${baseSlug}-${timestamp.toString(36)}`;

  // ── 5. Description ───────────────────────────────────────────────────────────
  const descParts: string[] = [];
  if (metadata.prompt) descParts.push(`Prompt: ${metadata.prompt}`);
  if (metadata.lyrics) descParts.push(`Lyrics:\n${metadata.lyrics.slice(0, 800)}`);
  descParts.push(`Imported from Suno · ${metadata.sourceUrl}`);

  // ── 6. Insert draft track ────────────────────────────────────────────────────
  const ds = metadata.durationSecs ?? null;
  const { data: track, error: insertErr } = await supabase
    .from("tracks")
    .insert({
      slug, title: metadata.title ?? "Untitled (Suno)", artist: metadata.artist ?? "Artista",
      genre_slug: "cinematic", mood: "Épico", cover: "violet",
      cover_image: coverPublicUrl, glyph: "🎵", bpm: null,
      duration: ds ? fmtDuration(ds) : "0:00", duration_secs: ds,
      audio_path: audioPublicUrl, storage_path: finalPath,
      file_format: finalExt, file_size: audioBuffer.byteLength,
      instruments: [], tags: metadata.tags, recommended_uses: [],
      description: descParts.join("\n\n"),
      is_new: true, published: false, processing_status: "ready",
      uploader_id: user.id, album_id: albumId ?? null,
      sort_order: Math.floor(timestamp / 1000),
    })
    .select("id")
    .maybeSingle();

  if (insertErr || !track) {
    await admin.storage.from("tracks").remove([finalPath]);
    return NextResponse.json(
      { error: "track_create_failed", message: insertErr?.message ?? "DB insert failed" },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  return NextResponse.json(
    { success: true, trackId: track.id, format: finalExt },
    { headers: CORS_HEADERS }
  );
}
