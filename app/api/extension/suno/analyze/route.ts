import { NextRequest, NextResponse } from "next/server";
import { getUserFromExtensionRequest, CORS_HEADERS } from "@/lib/supabase/extension-auth";
import { getProviderForUrl } from "@/lib/music-import";

export const runtime     = "nodejs";
export const maxDuration = 30;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromExtensionRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  let url: string;
  try {
    const body = await req.json();
    url = (body?.url ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400, headers: CORS_HEADERS });
  }
  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400, headers: CORS_HEADERS });
  }

  const provider = getProviderForUrl(url);
  if (!provider) {
    return NextResponse.json({
      success: false, audioAccessible: false, wavAvailable: false, wavUrl: null,
      error: "URL de Suno no reconocida.",
    }, { headers: CORS_HEADERS });
  }

  const result = await provider.analyze(url);

  // ── WAV availability check ──────────────────────────────────────────────────
  // Suno CDN often returns application/octet-stream for WAV — accept any 2xx.
  let wavAvailable = false;
  let wavUrl: string | null = null;
  if (result.success && result.metadata?.sourceId) {
    const candidate = `https://cdn1.suno.ai/${result.metadata.sourceId}.wav`;
    try {
      const head = await fetch(candidate, {
        method: "HEAD",
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          "Accept": "audio/wav,audio/*;q=0.9,*/*;q=0.8",
          "Referer": "https://suno.com/",
        },
        signal: AbortSignal.timeout(6_000),
      });
      if (head.ok) {
        wavAvailable = true;
        wavUrl = candidate;
      }
    } catch { /* WAV not reachable server-side */ }
  }

  return NextResponse.json({ ...result, wavAvailable, wavUrl }, { headers: CORS_HEADERS });
}
