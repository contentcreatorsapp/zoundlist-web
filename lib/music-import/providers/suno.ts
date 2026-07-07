import type { MusicImportProvider, AnalyzeResult, ImportedTrackMetadata } from "../types";

const SUNO_HOSTNAMES = ["suno.com", "www.suno.com", "suno.ai", "www.suno.ai"];

function extractSunoId(url: string): string | null {
  try {
    const u = new URL(url);
    const match = u.pathname.match(/\/song\/([a-f0-9-]{36})/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function isSunoShortUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return SUNO_HOSTNAMES.includes(u.hostname) && /^\/s\/[A-Za-z0-9_-]+/.test(u.pathname);
  } catch {
    return false;
  }
}

function fmtDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function decodeHTMLEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function parseMeta(html: string, property: string): string | null {
  // matches both property= and name= attributes, in any order
  const re = new RegExp(
    `<meta[^>]+(?:property|name)="${property}"[^>]+content="([^"]*)"[^>]*>|<meta[^>]+content="([^"]*)"[^>]+(?:property|name)="${property}"[^>]*>`,
    "i"
  );
  const m = html.match(re);
  const raw = m?.[1] ?? m?.[2] ?? null;
  return raw ? decodeHTMLEntities(raw) : null;
}

// For short /s/ URLs that use client-side redirects: extract UUID from HTML metadata
function extractSunoIdFromHtml(html: string): string | null {
  // og:url is the canonical song URL: https://suno.com/song/{uuid}
  const ogUrl = parseMeta(html, "og:url");
  if (ogUrl) {
    const id = extractSunoId(ogUrl);
    if (id) return id;
  }
  // <link rel="canonical" href="...">
  const canonMatch = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]*)"[^>]*>/i)
    ?? html.match(/<link[^>]+href="([^"]*)"[^>]+rel="canonical"[^>]*>/i);
  if (canonMatch?.[1]) {
    const id = extractSunoId(canonMatch[1]);
    if (id) return id;
  }
  // __NEXT_DATA__ may contain the clip ID directly
  const ndMatch = html.match(/"id"\s*:\s*"([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})"/i);
  return ndMatch?.[1] ?? null;
}

export const sunoProvider: MusicImportProvider = {
  platform: "suno",

  canHandle(url: string): boolean {
    try {
      const u = new URL(url);
      return SUNO_HOSTNAMES.includes(u.hostname) &&
        (/\/song\/[a-f0-9-]+/i.test(u.pathname) || /^\/s\/[A-Za-z0-9_-]+/.test(u.pathname));
    } catch {
      return false;
    }
  },

  async analyze(url: string): Promise<AnalyzeResult> {
    // ── Fetch page HTML (follows redirects — short /s/ URLs resolve to /song/{uuid}) ─
    let html: string;
    let finalUrl = url;
    try {
      const res = await fetch(url, {
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(15_000),
      });
      finalUrl = res.url; // resolved URL after any redirects
      if (res.status === 404) {
        return { success: false, audioAccessible: false, error: "Canción no encontrada. Verifica el enlace o que la canción sea pública." };
      }
      if (!res.ok) {
        return { success: false, audioAccessible: false, error: `No se pudo acceder a la página (${res.status}). Intenta de nuevo.` };
      }
      html = await res.text();
    } catch (err) {
      const msg = err instanceof Error && err.name === "TimeoutError"
        ? "Tiempo de espera agotado al conectar con Suno."
        : "No se pudo conectar con Suno. Revisa tu conexión.";
      return { success: false, audioAccessible: false, error: msg };
    }

    // Extract UUID — 3 fallback layers:
    // 1. Final URL after HTTP redirect (ideal case)
    // 2. og:url / <link rel="canonical"> in HTML (JS-redirect short URLs)
    // 3. First UUID found anywhere in __NEXT_DATA__ JSON
    const id = extractSunoId(finalUrl) ?? extractSunoIdFromHtml(html);
    if (!id && !isSunoShortUrl(url)) {
      return { success: false, audioAccessible: false, error: "No se pudo extraer el ID de la canción. Pega un enlace público de Suno." };
    }

    let title: string | null        = null;
    let audioUrl: string | null     = null;
    let coverUrl: string | null     = null;
    let durationSecs: number | null = null;
    let lyrics: string | null       = null;
    let prompt: string | null       = null;
    let tags: string[]              = [];

    // ── Method 1: __NEXT_DATA__ embedded JSON ─────────────────────────────────
    const ndMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (ndMatch?.[1]) {
      try {
        const nd = JSON.parse(ndMatch[1]);
        // Suno may nest the clip in different paths depending on page version
        const clip =
          nd?.props?.pageProps?.clip ??
          nd?.props?.pageProps?.initialData?.clips?.[0] ??
          nd?.props?.pageProps?.data?.clip;

        if (clip) {
          title        = clip.title ?? null;
          audioUrl     = clip.audio_url ?? null;
          coverUrl     = clip.image_url ?? null;
          durationSecs = typeof clip.metadata?.duration === "number" ? clip.metadata.duration : null;
          lyrics       = clip.lyric ?? null;
          prompt       = clip.metadata?.prompt ?? clip.metadata?.gpt_description_prompt ?? null;

          const rawTags = clip.metadata?.tags ?? clip.tags;
          if (typeof rawTags === "string") {
            tags = rawTags.split(",").map((t: string) => t.trim()).filter(Boolean);
          } else if (Array.isArray(rawTags)) {
            tags = rawTags.map(String).filter(Boolean);
          }
        }
      } catch {
        // __NEXT_DATA__ parse failed — fall through to meta tags
      }
    }

    // ── Method 2: Open Graph / Twitter Card meta tags (fallback) ─────────────
    if (!title)    title    = parseMeta(html, "og:title") ?? parseMeta(html, "twitter:title");
    if (!coverUrl) coverUrl = parseMeta(html, "og:image") ?? parseMeta(html, "twitter:image");
    if (!audioUrl) audioUrl = parseMeta(html, "og:audio") ?? parseMeta(html, "og:audio:url");
    if (!prompt)   prompt   = parseMeta(html, "og:description") ?? parseMeta(html, "description");

    // Clean up og:title suffixes Suno sometimes adds ("| Suno" etc.)
    if (title) title = title.replace(/\s*[\|—–]\s*Suno.*$/i, "").trim() || null;

    // ── Method 3: Known CDN pattern as last resort ────────────────────────────
    if (!audioUrl && id) {
      audioUrl = `https://cdn1.suno.ai/${id}.mp3`;
    }

    // ── Verify audio is actually accessible ───────────────────────────────────
    let audioAccessible = false;
    if (audioUrl) {
      try {
        const headRes = await fetch(audioUrl, {
          method: "HEAD",
          signal: AbortSignal.timeout(8_000),
        });
        audioAccessible = headRes.ok && (headRes.headers.get("content-type") ?? "").startsWith("audio");
        if (!audioAccessible) audioUrl = null;
      } catch {
        audioUrl = null;
      }
    }

    // If we couldn't even get a title or image, the page was probably private
    if (!title && !coverUrl) {
      return {
        success: false,
        audioAccessible: false,
        error: "No se encontró metadata pública. La canción puede ser privada o el enlace no es compatible.",
      };
    }

    const metadata: ImportedTrackMetadata = {
      platform: "suno",
      sourceId: id,
      sourceUrl: url,
      title,
      artist: null,
      durationSecs,
      duration: durationSecs ? fmtDuration(durationSecs) : null,
      audioUrl,
      coverUrl,
      lyrics,
      prompt,
      tags,
    };

    return { success: true, metadata, audioAccessible };
  },
};
