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
        "You are an art director for a professional stock music licensing platform. " +
        "Your album covers must look like premium editorial photography or minimal graphic design — " +
        "NOT science fiction, fantasy, or AI clichés (no glowing orbs, floating crystals, or fictional structures). " +
        "Write a single detailed image prompt (no intro text, no quotes). Rules:\n" +
        "- CORPORATE/BUSINESS: clean architectural photography, glass buildings, geometric shadows, " +
        "minimal abstract shapes, monochrome with green accent lines\n" +
        "- CINEMATIC: real dramatic landscapes (mountains, deserts, oceans), golden hour light, " +
        "aerial photography style, grand but grounded\n" +
        "- ELECTRONIC/DANCE: precise geometric patterns, circuit grids, waveform abstractions, neon minimal\n" +
        "- AMBIENT/MEDITATION: soft natural textures (water, fog, light through leaves), " +
        "minimal, peaceful, blurred\n" +
        "- JAZZ/ACOUSTIC: warm grain texture, warm light, intimate, organic materials (wood, brass)\n" +
        "Always use dark backgrounds (#0D0D0D base). Include neon green (#95F908) as ONE subtle accent. " +
        "No text, no human faces, no fantasy, no sci-fi.",
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

// ── Step 2: gpt-image-1 generates the image ───────────────────────────────────
async function generateImage(prompt: string): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured.");

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${apiKey}`,
      "content-type":  "application/json",
    },
    body: JSON.stringify({
      model:   "gpt-image-1",
      prompt,
      n:       1,
      size:    "1024x1024",
      quality: "medium",
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Image generation error: ${err?.error?.message ?? res.status}`);
  }
  const data = await res.json();
  const b64  = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image data in response");
  return Buffer.from(b64, "base64");
}

// ── Step 3: Upload buffer to Supabase Storage ─────────────────────────────────
async function saveToStorage(buffer: Buffer, albumId: string): Promise<string> {
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

    // 2. Generate image
    const imageBuffer = await generateImage(prompt);

    // 3. Save to Supabase Storage
    const coverUrl = await saveToStorage(imageBuffer, albumId);

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
