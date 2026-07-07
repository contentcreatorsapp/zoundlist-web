import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProviderForUrl } from "@/lib/music-import";

export const runtime     = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ── Parse body ────────────────────────────────────────────────────────────
  let url: string;
  try {
    const body = await req.json();
    url = (body?.url ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });

  // Basic URL sanity check
  try { new URL(url); } catch {
    return NextResponse.json({ success: false, audioAccessible: false, error: "URL inválida." });
  }

  // ── Route to provider ─────────────────────────────────────────────────────
  const provider = getProviderForUrl(url);
  if (!provider) {
    return NextResponse.json({
      success: false,
      audioAccessible: false,
      error: "Este enlace no está soportado. Pega un enlace público de Suno (suno.com/song/…).",
    });
  }

  // ── Analyze ───────────────────────────────────────────────────────────────
  const result = await provider.analyze(url);
  return NextResponse.json(result);
}
