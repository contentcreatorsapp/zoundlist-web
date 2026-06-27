"use client";

import { useState, useRef } from "react";
import type { Genre, Mood, CoverVariant } from "@/types/catalog";
import { COVERS } from "@/lib/catalog/covers";
import { createClient } from "@/lib/supabase/client";

const COVER_VARIANTS = Object.keys(COVERS) as CoverVariant[];

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "album";
}

const label: React.CSSProperties = { display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-2)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" };
const field: React.CSSProperties = { marginBottom: 22 };

export function AlbumForm({ genres, moods, uploaderId }: { genres: Genre[]; moods: Mood[]; uploaderId: string }) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState(genres[0]?.slug ?? "cinematic");
  const [mood, setMood] = useState(moods[0]?.name ?? "Épico");
  const [cover, setCover] = useState<CoverVariant>("violet");
  const [glyph, setGlyph] = useState("🎵");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const onCoverFile = (f: File) => {
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    setError(null);
    if (!title.trim()) return setError("El título del álbum es obligatorio.");
    setStatus("saving");

    const supabase = createClient();
    const base = slugify(title);

    let coverUrl: string | null = null;
    if (coverFile) {
      const ext = coverFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${Date.now()}-${base}.${ext}`;
      const { error: upErr } = await supabase.storage.from("covers").upload(path, coverFile, { cacheControl: "3600", upsert: false });
      if (upErr) { setStatus("idle"); return setError(`Error subiendo portada: ${upErr.message}`); }
      coverUrl = supabase.storage.from("covers").getPublicUrl(path).data.publicUrl;
    }

    const genreName = genres.find(g => g.slug === genre)?.name ?? genre;

    const insertRow = (id: string) => ({
      id,
      title: title.trim(),
      artist: artist.trim() || genreName,
      description: description.trim() || null,
      cover_image: coverUrl,
      cover,
      glyph: glyph || "🎵",
      genre_slug: genre,
      mood,
      uploader_id: uploaderId,
      published: true,
      sort_order: Math.floor(Date.now() / 1000),
    });

    let { error: insErr } = await supabase.from("albums").insert(insertRow(base));
    let finalId = base;
    if (insErr?.code === "23505") {
      finalId = `${base}-${Date.now().toString(36)}`;
      const retry = await supabase.from("albums").insert(insertRow(finalId));
      insErr = retry.error;
    }
    if (insErr) { setStatus("idle"); return setError(`Error guardando el álbum: ${insErr.message}`); }

    window.location.href = `/dashboard/albums/${finalId}`;
  };

  return (
    <div className="zl-card" style={{ padding: 32 }}>
      {/* Cover preview + upload */}
      <div style={field}>
        <label style={label}>Portada del álbum</label>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div
            onClick={() => coverRef.current?.click()}
            style={{
              width: 100, height: 100, borderRadius: 16, cursor: "pointer", flexShrink: 0,
              background: coverPreview ? `url(${coverPreview}) center/cover no-repeat` : COVERS[cover],
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem",
              border: "1px solid var(--border)", overflow: "hidden", position: "relative",
            }}
          >
            {!coverPreview && glyph}
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "0")}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </div>
          </div>
          <div>
            <button className="zl-btn zl-btn--ghost zl-btn--sm" onClick={() => coverRef.current?.click()} type="button">Subir imagen</button>
            <p style={{ fontSize: "0.75rem", color: "var(--text-3)", marginTop: 6 }}>1000 × 1000 px recomendado</p>
          </div>
          <input ref={coverRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && onCoverFile(e.target.files[0])} />
        </div>
      </div>

      {/* Gradient picker */}
      <div style={field}>
        <label style={label}>Gradiente (si no subes imagen)</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {COVER_VARIANTS.map(v => (
            <button key={v} type="button" onClick={() => setCover(v)} aria-label={v} style={{
              width: 36, height: 36, borderRadius: 8, cursor: "pointer", background: COVERS[v],
              border: cover === v ? "2px solid var(--brand)" : "2px solid transparent",
              boxShadow: cover === v ? "0 0 0 2px rgba(149,249,8,0.25)" : "none",
            }} />
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ ...field, gridColumn: "1 / -1" }}>
          <label style={label}>Título del álbum *</label>
          <input className="zl-input" type="text" placeholder="Nombre del álbum o EP" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div style={field}>
          <label style={label}>Artista</label>
          <input className="zl-input" type="text" placeholder="(por defecto: el género)" value={artist} onChange={e => setArtist(e.target.value)} />
        </div>
        <div style={field}>
          <label style={label}>Emoji</label>
          <input className="zl-input" type="text" maxLength={2} value={glyph} onChange={e => setGlyph(e.target.value)} />
        </div>
        <div style={field}>
          <label style={label}>Género</label>
          <select className="zl-input" value={genre} onChange={e => setGenre(e.target.value)}>
            {genres.map(g => <option key={g.slug} value={g.slug}>{g.name}</option>)}
          </select>
        </div>
        <div style={field}>
          <label style={label}>Mood</label>
          <select className="zl-input" value={mood} onChange={e => setMood(e.target.value)}>
            {moods.map(m => <option key={m.slug} value={m.name}>{m.name}</option>)}
          </select>
        </div>
      </div>

      <div style={field}>
        <label style={label}>Descripción (opcional)</label>
        <textarea className="zl-input" rows={3} placeholder="Cuéntanos sobre este álbum..." value={description} onChange={e => setDescription(e.target.value)} style={{ resize: "vertical" }} />
      </div>

      {error && <p style={{ fontSize: "0.84rem", color: "var(--orange)", marginBottom: 16 }}>{error}</p>}

      <button className="zl-btn zl-btn--primary" onClick={handleSubmit} disabled={status === "saving"}>
        {status === "saving" ? "Creando álbum…" : "Crear álbum →"}
      </button>
    </div>
  );
}
