import { NextRequest, NextResponse } from "next/server";
import { createClient }             from "@/lib/supabase/server";
import { createAdminClient }        from "@/lib/supabase/admin";
import { getAIProvider }            from "@/lib/ai/factory";
import type { TrackMetadataInput }  from "@/lib/ai/types";

export const runtime    = "nodejs";
export const maxDuration = 60;  // Vercel Pro: up to 300s; Hobby: 60s

export async function POST(req: NextRequest) {
  // ── 1. Auth ───────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Parse & validate body ──────────────────────────────────────────────
  let trackId: string;
  try {
    const body = await req.json();
    trackId = body?.trackId;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!trackId) {
    return NextResponse.json({ error: "trackId is required" }, { status: 400 });
  }

  // ── 3. Fetch track + verify ownership ────────────────────────────────────
  const { data: track, error: trackErr } = await supabase
    .from("tracks")
    .select("id, title, artist, genre_slug, mood, bpm, duration, description, instruments, tags, album_id")
    .eq("id", trackId)
    .eq("uploader_id", user.id)
    .maybeSingle();

  if (trackErr || !track) {
    return NextResponse.json({ error: "Track not found or access denied" }, { status: 404 });
  }

  // ── 4. Call AI provider ───────────────────────────────────────────────────
  const provider = getAIProvider();

  const input: TrackMetadataInput = {
    trackId,
    title:               track.title,
    artist:              track.artist,
    genre:               track.genre_slug,
    mood:                track.mood ?? null,
    bpm:                 (track.bpm && track.bpm > 0) ? track.bpm : null,
    duration:            track.duration ?? "",
    existingDescription: track.description ?? null,
    existingInstruments: track.instruments ?? [],
    existingTags:        track.tags ?? [],
  };

  const t0 = Date.now();
  let suggestion;
  try {
    suggestion = await provider.generateTrackMetadata(input);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI provider error";
    // Save failure record
    const admin = createAdminClient();
    await admin.from("ai_track_suggestions").upsert({
      track_id:  trackId,
      album_id:  track.album_id ?? null,
      status:    "failed",
      provider:  provider.id,
      error:     message,
      updated_at: new Date().toISOString(),
    }, { onConflict: "track_id" });
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const processingMs = Date.now() - t0;

  // ── 5. Persist suggestion (upsert — one row per track) ───────────────────
  const admin = createAdminClient();
  await admin.from("ai_track_suggestions").upsert({
    track_id:         trackId,
    album_id:         track.album_id ?? null,
    status:           "completed",
    provider:         provider.id,
    model:            provider.id === "anthropic" ? "claude-haiku-4-5-20251001" : provider.id,
    processing_ms:    processingMs,
    error:            null,
    title:            suggestion.title,
    description:      suggestion.description,
    genre:            suggestion.genre,
    subgenre:         suggestion.subgenre,
    moods:            suggestion.moods,
    energy:           suggestion.energy,
    bpm:              suggestion.bpm,
    musical_key:      suggestion.musicalKey,
    instruments:      suggestion.instruments,
    tags:             suggestion.tags,
    recommended_uses: suggestion.recommendedUses,
    confidence:       suggestion.confidence,
    updated_at:       new Date().toISOString(),
  }, { onConflict: "track_id" });

  // Update track ai_status
  await admin.from("tracks")
    .update({ ai_status: "ai_generated" })
    .eq("id", trackId);

  return NextResponse.json({ suggestion, processingMs });
}
