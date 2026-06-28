import { NextRequest, NextResponse } from "next/server";
import { createClient }             from "@/lib/supabase/server";
import { createAdminClient }        from "@/lib/supabase/admin";

export const runtime     = "nodejs";
export const maxDuration = 60;

// ── Step 1: Claude generates a DALL-E prompt optimized for album covers ────────
async function buildImagePrompt(
  title: string, artist: string, genre: string, mood: string | null
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured.");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key":         apiKey,
      "anthropic-version": "2023-06-01",
      "content-type":      "application/json",
    },
    body: JSON.stringify({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system:
        "You are an expert at writing DALL-E 3 prompts for professional music album covers. " +
        "Write a single detailed prompt (no intro text, no quotes) that will produce a " +
        "stunning, professional square album cover. Use dark, moody aesthetics with the brand " +
        "color neon green (#95F908) as an accent. Abstract or semi-abstract art preferred. " +
        "No text or typography in the image. No human faces.",
      messages: [{
        role: "user",
        content:
          `Create a DALL-E 3 prompt for an album cover with these details:\n` +
          `- Album title: ${title}\n` +
          `- Artist: ${artist}\n` +
          `- Genre: ${genre}\n` +
          `- Mood: ${mood ?? "not specified"}\n\n` +
          `Write only the image prompt, nothing else.`,
      }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text?.trim() ?? `Professional album cover for "${title}", ${genre} music, dark aesthetic`;
}

// ── Step 2: DALL-E 3 generates the image ──────────────────────────────────────
async function generateImage(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured.");

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${apiKey}`,
      "content-type":  "application/json",
    },
    body: JSON.stringify({
      model:   "dall-e-3",
      prompt,
      n:       1,
      size:    "1024x1024",
      quality: "standard",
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`DALL-E 3 error: ${err?.error?.message ?? res.status}`);
  }
  const data = await res.json();
  const url  = data.data?.[0]?.url;
  if (!url) throw new Error("No image URL in DALL-E response");
  return url;
}

// ── Step 3: Download + upload to Supabase Storage ─────────────────────────────
async function saveToStorage(imageUrl: string, albumId: string): Promise<string> {
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error("Could not download generated image");

  const buffer      = Buffer.from(await imgRes.arrayBuffer());
  const storagePath = `albums/${albumId}/ai-cover-${Date.now()}.jpg`;

  const admin = createAdminClient();
  const { error } = await admin.storage
    .from("tracks")
    .upload(storagePath, buffer, {
      contentType:   "image/jpeg",
      cacheControl:  "3600",
      upsert:        true,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data: { publicUrl } } = admin.storage.from("tracks").getPublicUrl(storagePath);
  return publicUrl;
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Parse body
  let albumId: string;
  try {
    const body = await req.json();
    albumId = body?.albumId;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!albumId) return NextResponse.json({ error: "albumId required" }, { status: 400 });

  // Fetch album + verify ownership
  const { data: album } = await supabase
    .from("albums")
    .select("id, title, artist, genre_slug, mood")
    .eq("id", albumId)
    .eq("uploader_id", user.id)
    .maybeSingle();

  if (!album) return NextResponse.json({ error: "Album not found or access denied" }, { status: 404 });

  try {
    // 1. Generate prompt with Claude
    const prompt = await buildImagePrompt(
      album.title, album.artist ?? "Unknown", album.genre_slug ?? "music", album.mood ?? null
    );

    // 2. Generate image with DALL-E 3
    const tempUrl = await generateImage(prompt);

    // 3. Save to Supabase Storage
    const coverUrl = await saveToStorage(tempUrl, albumId);

    // 4. Update album record
    const admin = createAdminClient();
    await admin.from("albums").update({ cover_image: coverUrl }).eq("id", albumId);

    return NextResponse.json({ coverUrl, prompt });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("generate-album-cover error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
