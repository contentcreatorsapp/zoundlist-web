"use client";

import { useState } from "react";
import type { Genre, Mood, CoverVariant } from "@/types/catalog";
import { COVERS } from "@/lib/catalog/covers";
import { createClient } from "@/lib/supabase/client";

const COVER_VARIANTS = Object.keys(COVERS) as CoverVariant[];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "track";
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-2)", marginBottom: 6 };
const fieldStyle: React.CSSProperties = { marginBottom: 18 };

export function UploadForm({ genres, moods }: { genres: Genre[]; moods: Mood[] }) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState(genres[0]?.slug ?? "cinematic");
  const [mood, setMood] = useState(moods[0]?.name ?? "Épico");
  const [bpm, setBpm] = useState("");
  const [duration, setDuration] = useState("");
  const [cover, setCover] = useState<CoverVariant>("violet");
  const [glyph, setGlyph] = useState("🎵");
  const [isNew, setIsNew] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [status, setStatus] = useState<"idle" | "uploading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const onCoverFile = (f: File | null) => {
    setCoverFile(f);
    setCoverPreview(f ? URL.createObjectURL(f) : null);
  };

  const onFile = (f: File | null) => {
    setFile(f);
    setError(null);
    if (!f) return;
    const url = URL.createObjectURL(f);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      if (!isNaN(audio.duration) && isFinite(audio.duration)) {
        const m = Math.floor(audio.duration / 60);
        const s = Math.floor(audio.duration % 60);
        setDuration(`${m}:${String(s).padStart(2, "0")}`);
      }
      URL.revokeObjectURL(url);
    };
    audio.src = url;
  };

  const reset = () => {
    setTitle(""); setArtist(""); setBpm(""); setDuration(""); setGlyph("🎵");
    setIsNew(true); setFeatured(false); setFile(null); setCoverFile(null); setCoverPreview(null); setStatus("idle"); setError(null);
  };

  const handleSubmit = async () => {
    setError(null);
    if (!title.trim()) return setError("Falta el título.");
    if (!file) return setError("Selecciona un archivo de audio.");

    setStatus("uploading");
    const supabase = createClient();

    // 1. Upload audio to Storage
    const ext = file.name.split(".").pop()?.toLowerCase() || "mp3";
    const base = slugify(title);
    const path = `${Date.now()}-${base}.${ext}`;
    const up = await supabase.storage.from("tracks").upload(path, file, { cacheControl: "3600", upsert: false });
    if (up.error) {
      setStatus("idle");
      return setError(`Error subiendo el audio: ${up.error.message}`);
    }
    const publicUrl = supabase.storage.from("tracks").getPublicUrl(path).data.publicUrl;

    // 1b. Optional cover image → covers bucket
    let coverUrl: string | null = null;
    if (coverFile) {
      const cext = coverFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const cpath = `${Date.now()}-${base}.${cext}`;
      const cup = await supabase.storage.from("covers").upload(cpath, coverFile, { cacheControl: "3600", upsert: false });
      if (cup.error) {
        setStatus("idle");
        return setError(`Error subiendo la portada: ${cup.error.message}`);
      }
      coverUrl = supabase.storage.from("covers").getPublicUrl(cpath).data.publicUrl;
    }

    // 2. Insert track row (retry slug on unique violation)
    const { data: { user } } = await supabase.auth.getUser();
    const genreName = genres.find((g) => g.slug === genre)?.name ?? genre;
    const row = (slug: string) => ({
      slug,
      title: title.trim(),
      artist: artist.trim() || genreName,
      genre_slug: genre,
      mood,
      cover,
      glyph: glyph || "🎵",
      bpm: bpm ? Number(bpm) : null,
      duration: duration || null,
      audio_path: publicUrl,
      cover_image: coverUrl,
      is_new: isNew,
      featured,
      published: true,
      uploader_id: user?.id ?? null,
      sort_order: Math.floor(Date.now() / 1000),
    });

    let ins = await supabase.from("tracks").insert(row(base));
    if (ins.error && ins.error.code === "23505") {
      ins = await supabase.from("tracks").insert(row(`${base}-${Date.now().toString(36)}`));
    }
    if (ins.error) {
      setStatus("idle");
      return setError(`Error guardando el track: ${ins.error.message}`);
    }

    setStatus("done");
  };

  if (status === "done") {
    return (
      <div className="zl-card" style={{ padding: 32, textAlign: "center" }}>
        <div style={{ fontSize: "2.4rem", marginBottom: 12 }}>🎵</div>
        <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 8 }}>¡Track publicado!</h3>
        <p className="zl-muted" style={{ marginBottom: 24 }}>
          <strong style={{ color: "var(--text)" }}>{title}</strong> ya está en el catálogo. Aparecerá en la home en ~1 minuto.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="zl-btn zl-btn--primary" onClick={reset}>Subir otro</button>
          <a className="zl-btn zl-btn--ghost" href="/">Ver la home</a>
        </div>
      </div>
    );
  }

  const busy = status === "uploading";

  return (
    <div className="zl-card" style={{ padding: 30 }}>
      {/* Audio file */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Archivo de audio (MP3 / WAV)</label>
        <input
          className="zl-input"
          type="file"
          accept="audio/*"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          style={{ padding: 10 }}
        />
        {file && <p style={{ fontSize: "0.78rem", color: "var(--text-3)", marginTop: 6 }}>{file.name} · {(file.size / 1_000_000).toFixed(1)} MB{duration ? ` · ${duration}` : ""}</p>}
      </div>

      {/* Cover image (optional) */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Portada (imagen cuadrada, opcional — recomendado 1000×1000)</label>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {coverPreview && <img src={coverPreview} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 12, border: "1px solid var(--border)", flexShrink: 0 }} />}
          <input className="zl-input" type="file" accept="image/*" onChange={(e) => onCoverFile(e.target.files?.[0] ?? null)} style={{ padding: 10 }} />
        </div>
        <p style={{ fontSize: "0.78rem", color: "var(--text-3)", marginTop: 6 }}>Si no subes imagen, se usa el gradiente que elijas abajo.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Título</label>
          <input className="zl-input" type="text" placeholder="Midnight Drive" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Artista / colección</label>
          <input className="zl-input" type="text" placeholder="(por defecto: el género)" value={artist} onChange={(e) => setArtist(e.target.value)} />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Género</label>
          <select className="zl-input" value={genre} onChange={(e) => setGenre(e.target.value)}>
            {genres.map((g) => <option key={g.slug} value={g.slug}>{g.name}</option>)}
          </select>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Mood</label>
          <select className="zl-input" value={mood} onChange={(e) => setMood(e.target.value)}>
            {moods.map((m) => <option key={m.slug} value={m.name}>{m.name}</option>)}
          </select>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>BPM</label>
          <input className="zl-input" type="number" placeholder="118" value={bpm} onChange={(e) => setBpm(e.target.value)} />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Duración (auto)</label>
          <input className="zl-input" type="text" placeholder="2:43" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>
      </div>

      {/* Cover variant */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Portada (estilo de gradiente)</label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {COVER_VARIANTS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setCover(v)}
              aria-label={`Portada ${v}`}
              style={{
                width: 46, height: 46, borderRadius: 10, cursor: "pointer",
                background: COVERS[v],
                border: cover === v ? "2px solid var(--lime)" : "2px solid transparent",
                boxShadow: cover === v ? "0 0 0 2px rgba(205,255,79,0.25)" : "none",
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 18, alignItems: "end" }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Emoji</label>
          <input className="zl-input" type="text" maxLength={2} value={glyph} onChange={(e) => setGlyph(e.target.value)} />
        </div>
        <div style={{ ...fieldStyle, display: "flex", gap: 20, alignItems: "center" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: "0.85rem", color: "var(--text-2)", cursor: "pointer" }}>
            <input type="checkbox" checked={isNew} onChange={(e) => setIsNew(e.target.checked)} /> Marcar como novedad
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: "0.85rem", color: "var(--text-2)", cursor: "pointer" }}>
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} /> Destacado
          </label>
        </div>
      </div>

      {error && <p style={{ fontSize: "0.82rem", color: "var(--orange)", margin: "4px 0 16px", lineHeight: 1.45 }}>{error}</p>}

      <button className="zl-btn zl-btn--primary zl-btn--block" onClick={handleSubmit} disabled={busy} style={{ marginTop: 8 }}>
        {busy ? "Subiendo…" : "Publicar track"}
      </button>
    </div>
  );
}
