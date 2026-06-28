"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CoverVariant } from "@/types/catalog";

// ── Constants ─────────────────────────────────────────────────────────────────
const AUDIO_EXTS = new Set(["mp3", "wav", "aiff", "aif", "flac"]);
const MIME: Record<string, string> = {
  mp3: "audio/mpeg", wav: "audio/wav",
  aiff: "audio/aiff", aif: "audio/aiff", flac: "audio/flac",
};
const MAX_ZIP_MB = 300;

// ── Magic-byte audio validation ───────────────────────────────────────────────
// Extension spoofing check: read the first 12 bytes and verify known audio signatures.
// A file renamed to .mp3 that's actually a PDF or image is rejected here.
function isAudioMagic(bytes: Uint8Array): boolean {
  // MP3 — ID3v2 tag
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return true;
  // MP3 — MPEG sync word (0xFF 0xEx or 0xFF 0xFx)
  if (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0) return true;
  // WAV — RIFF header
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) return true;
  // FLAC — fLaC marker
  if (bytes[0] === 0x66 && bytes[1] === 0x4C && bytes[2] === 0x61 && bytes[3] === 0x43) return true;
  // AIFF — FORM header
  if (bytes[0] === 0x46 && bytes[1] === 0x4F && bytes[2] === 0x52 && bytes[3] === 0x4D) return true;
  return false;
}

// ── Title cleaning ────────────────────────────────────────────────────────────
// Turns "01 - My Track Name.mp3" or "03_great_song.wav" into "My Track Name"
function cleanTitle(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, "")           // strip extension
    .replace(/^\d+[\s._\-–]+/, "")     // strip leading track number "01 - " or "03_"
    .replace(/[_]/g, " ")              // underscores → spaces
    .replace(/\s+/g, " ")             // collapse multiple spaces
    .trim();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function slugify(s: string): string {
  return s.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 60) || "track";
}

function fmtDuration(secs: number | null): string {
  if (!secs || isNaN(secs)) return "";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ── Audio metadata analysis ───────────────────────────────────────────────────
// Uses music-metadata (header-only, does NOT decode audio — memory-efficient).
// Falls back to Web Audio API (full decode) if music-metadata can't parse the file.
async function analyzeAudio(blob: Blob, fileName: string, fileSize: number): Promise<{
  durationSecs: number | null;
  bitrate: number | null;
  sampleRate: number | null;
  channels: number | null;
}> {
  try {
    const { parseBlob } = await import("music-metadata");
    const meta        = await parseBlob(new File([blob], fileName, { type: blob.type }));
    const durationSecs = meta.format.duration ?? null;
    const sampleRate   = meta.format.sampleRate ?? null;
    const channels     = meta.format.numberOfChannels ?? null;
    let bitrate        = meta.format.bitrate ? Math.round(meta.format.bitrate / 1000) : null;
    if (!bitrate && durationSecs && durationSecs > 0) {
      // VBR MP3 without Xing frame — estimate from file size
      bitrate = Math.round((fileSize * 8) / (durationSecs * 1000));
    }
    return { durationSecs, bitrate, sampleRate, channels };
  } catch {
    // Fallback: Web Audio API (slower, decodes entire file)
    try {
      const ab       = await blob.arrayBuffer();
      const ctx      = new AudioContext();
      const audio    = await ctx.decodeAudioData(ab);
      await ctx.close();
      const dur = audio.duration;
      return {
        durationSecs: dur,
        sampleRate:   audio.sampleRate,
        channels:     audio.numberOfChannels,
        bitrate:      dur > 0 ? Math.round((fileSize * 8) / (dur * 1000)) : null,
      };
    } catch {
      return { durationSecs: null, bitrate: null, sampleRate: null, channels: null };
    }
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────
type FileStatus = "pending" | "analyzing" | "uploading" | "done" | "error";

interface FileEntry {
  displayName: string;
  status: FileStatus;
  durationSecs: number | null;
  error?: string;
}

interface Props {
  albumId: string;
  artistName: string;
  genreSlug: string;
  mood: string;
  cover: CoverVariant;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ZipUpload({ albumId, artistName, genreSlug, mood, cover }: Props) {
  const router   = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [zipFile, setZipFile] = useState<File | null>(null);
  const [phase, setPhase]     = useState<"idle" | "processing" | "done">("idle");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [warning, setWarning] = useState("");

  const patch = (displayName: string, update: Partial<FileEntry>) =>
    setEntries(prev => prev.map(e => e.displayName === displayName ? { ...e, ...update } : e));

  const onPickFile = (file: File | null) => {
    setWarning("");
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setWarning("Solo se aceptan archivos .zip");
      return;
    }
    if (file.size > MAX_ZIP_MB * 1024 * 1024) {
      setWarning(`El ZIP supera el límite de ${MAX_ZIP_MB} MB. Considera dividirlo.`);
      return;
    }
    setZipFile(file);
  };

  const handleProcess = async () => {
    if (!zipFile) return;
    setPhase("processing");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setWarning("Sesión expirada. Recarga la página.");
      setPhase("idle");
      return;
    }

    const JSZip = (await import("jszip")).default;

    let zip: InstanceType<typeof JSZip>;
    try {
      zip = await JSZip.loadAsync(zipFile);
    } catch {
      setWarning("No se pudo leer el ZIP. Verifica que no esté corrupto.");
      setPhase("idle");
      return;
    }

    // Filter valid audio entries — skip macOS artifacts and non-audio extensions
    const audioEntries = Object.entries(zip.files).filter(([name, entry]) => {
      if (entry.dir) return false;
      if (name.startsWith("__MACOSX/") || name.split("/").some(p => p.startsWith("."))) return false;
      const ext = name.split(".").pop()?.toLowerCase() ?? "";
      return AUDIO_EXTS.has(ext);
    });

    if (audioEntries.length === 0) {
      setWarning("El ZIP no contiene archivos de audio válidos (MP3, WAV, AIFF, FLAC).");
      setPhase("idle");
      return;
    }

    setEntries(audioEntries.map(([name]) => ({
      displayName: name.split("/").pop() ?? name,
      status: "pending",
      durationSecs: null,
    })));

    for (const [fullName, zipEntry] of audioEntries) {
      const displayName = fullName.split("/").pop() ?? fullName;
      const ext         = displayName.split(".").pop()?.toLowerCase() ?? "mp3";
      const rawTitle    = cleanTitle(displayName);       // "01 - My Track.mp3" → "My Track"

      patch(displayName, { status: "analyzing" });

      let arrayBuffer: ArrayBuffer;
      try {
        arrayBuffer = await zipEntry.async("arraybuffer");
      } catch {
        patch(displayName, { status: "error", error: "No se pudo extraer del ZIP" });
        continue;
      }

      // ── Magic byte check (Fix 1) ─────────────────────────────────────────
      const magic = new Uint8Array(arrayBuffer.slice(0, 12));
      if (!isAudioMagic(magic)) {
        patch(displayName, { status: "error", error: "No es un archivo de audio válido" });
        continue;
      }

      const fileSize = arrayBuffer.byteLength;
      const blob     = new Blob([arrayBuffer], { type: MIME[ext] ?? "audio/*" });

      // ── Audio metadata ───────────────────────────────────────────────────
      const { durationSecs, bitrate, sampleRate, channels } =
        await analyzeAudio(blob, displayName, fileSize);

      // ── Storage upload (Fix 2: organized path) ───────────────────────────
      // Path: producers/{userId}/albums/{albumId}/{timestamp}-{slug}.{ext}
      patch(displayName, { status: "uploading" });

      const slug        = slugify(rawTitle);
      const storagePath = `producers/${user.id}/albums/${albumId}/${Date.now()}-${slug}.${ext}`;

      const { error: storageErr } = await supabase.storage
        .from("tracks")
        .upload(storagePath, blob, { cacheControl: "3600", upsert: false });

      if (storageErr) {
        patch(displayName, { status: "error", error: storageErr.message });
        continue;
      }

      const audioUrl = supabase.storage.from("tracks").getPublicUrl(storagePath).data.publicUrl;

      // ── DB insert (Fix 3: clean title; rollback storage on failure) ──────
      const trackSlug = `${slug}-${Date.now().toString(36)}`;

      const { error: insertErr } = await supabase.from("tracks").insert({
        slug:             trackSlug,
        title:            rawTitle,            // clean title from filename
        artist:           artistName,
        genre_slug:       genreSlug,
        mood,
        cover,
        glyph:            "🎵",
        bpm:              null,
        duration:         fmtDuration(durationSecs),
        duration_secs:    durationSecs,
        audio_path:       audioUrl,
        storage_path:     storagePath,
        file_size:        fileSize,
        file_format:      ext,
        bitrate,
        sample_rate:      sampleRate,
        channels,
        instruments:      [],
        tags:             [],
        recommended_uses: [],
        published:        false,               // always draft — requires manual review
        processing_status: "ready",
        uploader_id:      user.id,
        album_id:         albumId,
        sort_order:       Math.floor(Date.now() / 1000),
      });

      if (insertErr) {
        // Fix 3: rollback the storage upload to avoid orphaned files
        await supabase.storage.from("tracks").remove([storagePath]);
        patch(displayName, { status: "error", error: insertErr.message });
        continue;
      }

      patch(displayName, { status: "done", durationSecs });
    }

    setPhase("done");
    router.refresh();
  };

  // ── Render: done ──────────────────────────────────────────────────────────
  if (phase === "done") {
    const doneCount  = entries.filter(e => e.status === "done").length;
    const errorCount = entries.filter(e => e.status === "error").length;

    return (
      <section style={card}>
        <p style={eyebrow}>Subida por ZIP</p>
        <h3 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 12 }}>
          {doneCount} track{doneCount !== 1 ? "s" : ""} añadido{doneCount !== 1 ? "s" : ""}
          {errorCount > 0 && (
            <span style={{ color: "var(--orange)", marginLeft: 8 }}>{errorCount} con error</span>
          )}
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
          {entries.map(e => (
            <div key={e.displayName} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.83rem" }}>
              <span style={{ color: e.status === "done" ? "var(--brand)" : "var(--orange)", fontWeight: 700, width: 14, flexShrink: 0 }}>
                {e.status === "done" ? "✓" : "✗"}
              </span>
              <span style={{ color: "var(--text-2)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {e.displayName}
              </span>
              {e.durationSecs != null && (
                <span style={{ color: "var(--text-3)", flexShrink: 0 }}>{fmtDuration(e.durationSecs)}</span>
              )}
              {e.error && (
                <span style={{ color: "var(--orange)", fontSize: "0.74rem", flexShrink: 0 }}>{e.error}</span>
              )}
            </div>
          ))}
        </div>

        <p style={{ fontSize: "0.83rem", color: "var(--text-3)", marginBottom: 16 }}>
          Los tracks están en <strong style={{ color: "var(--text-2)" }}>borrador</strong>. Usa el botón "Editar" de cada uno para completar la metadata antes de publicar.
        </p>
        <button
          className="zl-btn zl-btn--ghost zl-btn--sm"
          onClick={() => { setPhase("idle"); setZipFile(null); setEntries([]); }}
        >
          Subir otro ZIP
        </button>
      </section>
    );
  }

  // ── Render: processing ────────────────────────────────────────────────────
  if (phase === "processing") {
    return (
      <section style={card}>
        <p style={eyebrow}>Subida por ZIP</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {entries.map(e => (
            <div key={e.displayName} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.83rem", padding: "9px 12px", background: "var(--bg)", borderRadius: 8 }}>
              <span style={{ width: 18, textAlign: "center", flexShrink: 0 }}>
                {e.status === "pending"    ? "⏳"
                : e.status === "analyzing" ? "🔍"
                : e.status === "uploading" ? "⬆️"
                : e.status === "done"      ? "✅"
                :                           "❌"}
              </span>
              <span style={{ flex: 1, color: "var(--text-2)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {e.displayName}
              </span>
              <span style={{ fontSize: "0.74rem", color: "var(--text-3)", flexShrink: 0 }}>
                {e.status === "pending"    ? "En espera"
                : e.status === "analyzing" ? "Analizando…"
                : e.status === "uploading" ? "Subiendo…"
                : e.status === "done"      ? (fmtDuration(e.durationSecs) || "Listo")
                : (e.error ?? "Error")}
              </span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // ── Render: idle ──────────────────────────────────────────────────────────
  return (
    <section style={card}>
      <p style={eyebrow}>Subida rápida por ZIP</p>
      <p style={{ fontSize: "0.84rem", color: "var(--text-2)", marginBottom: 16 }}>
        Sube un ZIP con MP3, WAV, AIFF o FLAC. Cada archivo se convierte en un track en <strong>borrador</strong> asociado a este álbum.
      </p>

      <div
        role="button"
        tabIndex={0}
        style={{
          border: "2px dashed var(--border)", borderRadius: 12,
          padding: "28px 20px", textAlign: "center", cursor: "pointer",
          transition: "border-color 0.15s",
        }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={e => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={e => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).style.borderColor = "var(--brand)";
        }}
        onDragLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = "";
        }}
        onDrop={e => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).style.borderColor = "";
          onPickFile(e.dataTransfer.files[0] ?? null);
        }}
      >
        <p style={{ fontSize: "1.8rem", marginBottom: 8 }}>🗜️</p>
        {zipFile ? (
          <p style={{ fontSize: "0.9rem", color: "var(--text)" }}>
            <strong>{zipFile.name}</strong> · {(zipFile.size / 1_000_000).toFixed(1)} MB
          </p>
        ) : (
          <>
            <p style={{ fontSize: "0.9rem", color: "var(--text-2)" }}>
              Arrastra tu ZIP aquí o haz clic para seleccionar
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-3)", marginTop: 4 }}>
              Máx. {MAX_ZIP_MB} MB · MP3, WAV, AIFF, FLAC
            </p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".zip"
        style={{ display: "none" }}
        onChange={e => onPickFile(e.target.files?.[0] ?? null)}
      />

      {warning && (
        <p style={{ fontSize: "0.82rem", color: "var(--orange)", marginTop: 8 }}>{warning}</p>
      )}

      {zipFile && (
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button className="zl-btn zl-btn--primary" onClick={handleProcess}>
            Extraer y subir tracks
          </button>
          <button
            className="zl-btn zl-btn--ghost"
            onClick={() => { setZipFile(null); setWarning(""); }}
          >
            Cancelar
          </button>
        </div>
      )}
    </section>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  marginTop: 28, padding: "22px 24px",
  border: "1px dashed var(--border)", borderRadius: 16,
  background: "var(--surface)",
};

const eyebrow: React.CSSProperties = {
  fontSize: "0.68rem", fontWeight: 700, color: "var(--brand)",
  textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10,
};
