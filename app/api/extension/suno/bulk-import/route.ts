import { NextRequest, NextResponse } from "next/server";
import { getUserFromExtensionRequest, createUserSupabase, CORS_HEADERS } from "@/lib/supabase/extension-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ImportedTrackMetadata } from "@/lib/music-import/types";

export const runtime     = "nodejs";
export const maxDuration = 300;

const MAX_TRACKS = 10;

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "track";
}
function fmtDuration(secs: number): string {
  const m = Math.floor(secs / 60), s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface TrackRequest {
  metadata: ImportedTrackMetadata;
  albumId?: string;
  preferWav?: boolean;
  wavUrl?: string | null;
}

interface TrackResult {
  sourceUrl: string;
  success: boolean;
  trackId?: string;
  format?: string;
  error?: string;
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

  let tracks: TrackRequest[];
  try {
    const body = await req.json();
    tracks = Array.isArray(body?.tracks) ? body.tracks : [];
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400, headers: CORS_HEADERS });
  }

  if (tracks.length === 0) {
    return NextResponse.json({ error: "No tracks provided" }, { status: 400, headers: CORS_HEADERS });
  }
  if (tracks.length > MAX_TRACKS) {
    tracks = tracks.slice(0, MAX_TRACKS);
  }

  const admin    = createAdminClient();
  const supabase = createUserSupabase(token);
  const results: TrackResult[] = [];

  for (const item of tracks) {
    const { metadata, albumId, preferWav = false, wavUrl = null } = item;
    const sourceUrl = metadata?.sourceUrl ?? "unknown";

    if (!metadata?.audioUrl && !(preferWav && wavUrl)) {
      results.push({ sourceUrl, success: false, error: "No audio URL available." });
      continue;
    }

    const effectiveAudioUrl = (preferWav && wavUrl) ? wavUrl : metadata.audioUrl!;
    const isWav = preferWav && !!wavUrl;
    const timestamp = Date.now();
    const titleSlug = slugify(metadata.title ?? "suno-track");
    const ext  = isWav ? "wav" : "mp3";
    const mime = isWav ? "audio/wav" : "audio/mpeg";
    let storagePath = `producers/${user.id}/suno/${timestamp}-${titleSlug}.${ext}`;

    // Download audio
    let audioBuffer: ArrayBuffer;
    try {
      const res = await fetch(effectiveAudioUrl, {
        headers: { "User-Agent": "Zoundlist/1.0" },
        signal: AbortSignal.timeout(45_000),
      });
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      audioBuffer = await res.arrayBuffer();
    } catch {
      if (isWav && metadata.audioUrl) {
        try {
          const r2 = await fetch(metadata.audioUrl, {
            headers: { "User-Agent": "Zoundlist/1.0" },
            signal: AbortSignal.timeout(45_000),
          });
          if (!r2.ok) throw new Error(`mp3 ${r2.status}`);
          audioBuffer = await r2.arrayBuffer();
          storagePath = storagePath.replace(".wav", ".mp3");
        } catch (err2) {
          results.push({ sourceUrl, success: false, error: err2 instanceof Error ? err2.message : "Download failed" });
          continue;
        }
      } else {
        results.push({ sourceUrl, success: false, error: "Audio download failed" });
        continue;
      }
    }

    const finalExt  = storagePath.endsWith(".wav") ? "wav" : "mp3";
    const finalMime = finalExt === "wav" ? "audio/wav" : "audio/mpeg";

    // Upload audio
    const { error: storeErr } = await admin.storage.from("tracks").upload(storagePath, audioBuffer, {
      contentType: finalMime, cacheControl: "3600", upsert: false,
    });
    if (storeErr) {
      results.push({ sourceUrl, success: false, error: storeErr.message });
      continue;
    }
    const audioPublicUrl = admin.storage.from("tracks").getPublicUrl(storagePath).data.publicUrl;

    // Cover art (non-fatal)
    let coverPublicUrl: string | null = null;
    if (metadata.coverUrl) {
      try {
        const cr = await fetch(metadata.coverUrl, { signal: AbortSignal.timeout(10_000) });
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

    // Unique slug
    const baseSlug = `suno-${metadata.sourceId ?? titleSlug}`;
    let slug = baseSlug;
    const { data: existing } = await supabase.from("tracks").select("id").eq("slug", slug).maybeSingle();
    if (existing) slug = `${baseSlug}-${timestamp.toString(36)}`;

    // Description
    const dp: string[] = [];
    if (metadata.prompt) dp.push(`Prompt: ${metadata.prompt}`);
    if (metadata.lyrics) dp.push(`Lyrics:\n${metadata.lyrics.slice(0, 800)}`);
    dp.push(`Imported from Suno · ${metadata.sourceUrl}`);

    const ds = metadata.durationSecs ?? null;
    const { data: track, error: insertErr } = await supabase
      .from("tracks")
      .insert({
        slug, title: metadata.title ?? "Untitled (Suno)", artist: metadata.artist ?? "Artista",
        genre_slug: "cinematic", mood: "Épico", cover: "violet",
        cover_image: coverPublicUrl, glyph: "🎵", bpm: null,
        duration: ds ? fmtDuration(ds) : "0:00", duration_secs: ds,
        audio_path: audioPublicUrl, storage_path: storagePath,
        file_format: finalExt, file_size: audioBuffer.byteLength,
        instruments: [], tags: metadata.tags, recommended_uses: [],
        description: dp.join("\n\n"),
        is_new: true, published: false, processing_status: "ready",
        uploader_id: user.id, album_id: albumId ?? null,
        sort_order: Math.floor(timestamp / 1000),
      })
      .select("id")
      .maybeSingle();

    if (insertErr || !track) {
      await admin.storage.from("tracks").remove([storagePath]);
      results.push({ sourceUrl, success: false, error: insertErr?.message ?? "DB insert failed" });
    } else {
      results.push({ sourceUrl, success: true, trackId: track.id, format: finalExt });
    }
  }

  const successCount = results.filter(r => r.success).length;
  return NextResponse.json(
    { results, successCount, failCount: results.length - successCount },
    { headers: CORS_HEADERS }
  );
}
