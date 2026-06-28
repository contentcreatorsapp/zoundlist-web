"use client";

import { useState } from "react";
import type { Genre, Mood } from "@/types/catalog";
import type { ProducerTrack } from "@/services/producer";
import { createClient } from "@/lib/supabase/client";

const MUSICAL_KEYS = [
  "C Major","Db Major","D Major","Eb Major","E Major","F Major",
  "F# Major","G Major","Ab Major","A Major","Bb Major","B Major",
  "A Minor","Bb Minor","B Minor","C Minor","C# Minor","D Minor",
  "Eb Minor","E Minor","F Minor","F# Minor","G Minor","G# Minor",
];

const RECOMMENDED_USES = [
  { id: "youtube",    label: "YouTube / Redes Sociales" },
  { id: "podcast",    label: "Podcast / Radio" },
  { id: "publicidad", label: "Publicidad / Comercial" },
  { id: "cine-tv",   label: "Cine / TV / Documentales" },
  { id: "videojuegos",label: "Videojuegos" },
  { id: "corporativo",label: "Corporativo / Empresarial" },
  { id: "adoracion",  label: "Iglesia / Adoración" },
  { id: "educacion",  label: "Educación" },
];

const label: React.CSSProperties = {
  display: "block", fontSize: "0.75rem", fontWeight: 700,
  color: "var(--text-2)", marginBottom: 6,
  textTransform: "uppercase", letterSpacing: "0.06em",
};
const field: React.CSSProperties = { marginBottom: 22 };
const section: React.CSSProperties = {
  borderTop: "1px solid var(--border)", paddingTop: 28, marginTop: 28,
};

export function TrackEditForm({ track, genres, moods }: {
  track: ProducerTrack;
  genres: Genre[];
  moods: Mood[];
}) {
  const [title, setTitle]           = useState(track.title);
  const [artist, setArtist]         = useState(track.artist);
  const [genre, setGenre]           = useState(track.genre);
  const [subgenre, setSubgenre]     = useState(track.subgenre ?? "");
  const [mood, setMood]             = useState(track.mood);
  const [bpm, setBpm]               = useState(track.bpm ? String(track.bpm) : "");
  const [musicalKey, setMusicalKey] = useState(track.musicalKey ?? "");
  const [energyEnabled, setEnergyEnabled] = useState(track.energy !== null);
  const [energy, setEnergy]         = useState(track.energy ?? 5);
  const [instruments, setInstruments] = useState(track.instruments.join(", "));
  const [tags, setTags]             = useState(track.tags.join(", "));
  const [uses, setUses]             = useState<string[]>(track.recommendedUses);
  const [description, setDescription] = useState(track.description ?? "");
  const [isNew, setIsNew]           = useState(track.isNew);
  const [featured, setFeatured]     = useState(track.featured);
  const [published, setPublished]   = useState(track.published);

  const [status, setStatus]         = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError]           = useState<string | null>(null);

  const toggleUse = (id: string) =>
    setUses(prev => prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]);

  const toArray = (s: string) =>
    s.split(",").map(x => x.trim()).filter(Boolean);

  const handleSave = async () => {
    setError(null);
    if (!title.trim()) return setError("El título es obligatorio.");
    setStatus("saving");

    const supabase = createClient();
    const { error: err } = await supabase
      .from("tracks")
      .update({
        title:             title.trim(),
        artist:            artist.trim(),
        genre_slug:        genre,
        subgenre:          subgenre.trim() || null,
        mood,
        bpm:               bpm ? Number(bpm) : null,
        musical_key:       musicalKey || null,
        energy:            energyEnabled ? energy : null,
        instruments:       toArray(instruments),
        tags:              toArray(tags),
        recommended_uses:  uses,
        description:       description.trim() || null,
        is_new:            isNew,
        featured,
        published,
      })
      .eq("id", track.id);

    if (err) {
      setStatus("idle");
      return setError(`Error: ${err.message}`);
    }
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2500);
  };

  return (
    <div className="zl-card" style={{ padding: 32 }}>

      {/* ── Identificación ── */}
      <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--brand)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 20 }}>Identificación</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ ...field, gridColumn: "1 / -1" }}>
          <label style={label}>Título *</label>
          <input className="zl-input" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div style={field}>
          <label style={label}>Artista</label>
          <input className="zl-input" value={artist} onChange={e => setArtist(e.target.value)} />
        </div>
        <div style={field}>
          <label style={label}>Duración (auto)</label>
          <input className="zl-input" value={track.duration} disabled style={{ opacity: 0.5 }} />
        </div>
      </div>

      {/* ── Clasificación ── */}
      <div style={section}>
        <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--brand)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 20 }}>Clasificación</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div style={field}>
            <label style={label}>Género</label>
            <select className="zl-input" value={genre} onChange={e => setGenre(e.target.value)}>
              {genres.map(g => <option key={g.slug} value={g.slug}>{g.name}</option>)}
            </select>
          </div>
          <div style={field}>
            <label style={label}>Subgénero</label>
            <input className="zl-input" placeholder="ej. Neoclásico, Chillhop..." value={subgenre} onChange={e => setSubgenre(e.target.value)} />
          </div>
          <div style={field}>
            <label style={label}>Mood / Emoción</label>
            <select className="zl-input" value={mood} onChange={e => setMood(e.target.value)}>
              {moods.map(m => <option key={m.slug} value={m.name}>{m.name}</option>)}
            </select>
          </div>
          <div style={field}>
            <label style={{ ...label, display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <input
                type="checkbox" checked={energyEnabled}
                onChange={e => setEnergyEnabled(e.target.checked)}
                style={{ accentColor: "var(--brand)", width: 15, height: 15 }}
              />
              Energía{energyEnabled ? `: ${energy}/10` : " (no especificada)"}
            </label>
            <input
              type="range" min={1} max={10} value={energy}
              onChange={e => { setEnergyEnabled(true); setEnergy(Number(e.target.value)); }}
              style={{ width: "100%", accentColor: "var(--brand)", opacity: energyEnabled ? 1 : 0.35 }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-3)", marginTop: 4 }}>
              <span>Tranquilo</span><span>Intenso</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Detalles musicales ── */}
      <div style={section}>
        <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--brand)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 20 }}>Detalles musicales</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div style={field}>
            <label style={label}>BPM</label>
            <input className="zl-input" type="number" placeholder="120" value={bpm} onChange={e => setBpm(e.target.value)} />
          </div>
          <div style={field}>
            <label style={label}>Tonalidad (Key)</label>
            <select className="zl-input" value={musicalKey} onChange={e => setMusicalKey(e.target.value)}>
              <option value="">Sin especificar</option>
              <optgroup label="Mayor">
                {MUSICAL_KEYS.filter(k => k.includes("Major")).map(k => <option key={k} value={k}>{k}</option>)}
              </optgroup>
              <optgroup label="Menor">
                {MUSICAL_KEYS.filter(k => k.includes("Minor")).map(k => <option key={k} value={k}>{k}</option>)}
              </optgroup>
            </select>
          </div>
          <div style={{ ...field, gridColumn: "1 / -1" }}>
            <label style={label}>Instrumentos <span style={{ fontWeight: 400, textTransform: "none" }}>(separados por coma)</span></label>
            <input className="zl-input" placeholder="Piano, Cuerdas, Batería, Guitarra acústica..." value={instruments} onChange={e => setInstruments(e.target.value)} />
          </div>
        </div>
      </div>

      {/* ── Catalogación ── */}
      <div style={section}>
        <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--brand)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 20 }}>Catalogación</p>

        <div style={field}>
          <label style={label}>Tags <span style={{ fontWeight: 400, textTransform: "none" }}>(separados por coma)</span></label>
          <input className="zl-input" placeholder="épico, película, aventura, orquestal..." value={tags} onChange={e => setTags(e.target.value)} />
        </div>

        <div style={field}>
          <label style={label}>Usos recomendados</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginTop: 4 }}>
            {RECOMMENDED_USES.map(u => (
              <label key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.86rem", color: "var(--text-2)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={uses.includes(u.id)}
                  onChange={() => toggleUse(u.id)}
                  style={{ accentColor: "var(--brand)", width: 16, height: 16 }}
                />
                {u.label}
              </label>
            ))}
          </div>
        </div>

        <div style={field}>
          <label style={label}>Descripción</label>
          <textarea
            className="zl-input" rows={4}
            placeholder="Describe el track: ambiente, narrativa, instrumentación, a qué tipo de proyecto se adapta..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            style={{ resize: "vertical" }}
          />
        </div>
      </div>

      {/* ── Flags ── */}
      <div style={section}>
        <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--brand)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Visibilidad</p>
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
          {([
            [published, setPublished, "Publicado"] ,
            [isNew, setIsNew, "Novedad"],
            [featured, setFeatured, "Destacado"],
          ] as [boolean, (v: boolean) => void, string][]).map(([val, setter, lbl]) => (
            <label key={lbl} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.88rem", color: "var(--text-2)", cursor: "pointer" }}>
              <input type="checkbox" checked={val} onChange={e => setter(e.target.checked)} style={{ accentColor: "var(--brand)", width: 16, height: 16 }} />
              {lbl}
            </label>
          ))}
        </div>
      </div>

      {/* ── Info técnica (read-only) ── */}
      {(track.fileFormat || track.bitrate || track.sampleRate) && (
        <div style={section}>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Info técnica</p>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {track.fileFormat && <span style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>Formato: <strong style={{ color: "var(--text-2)" }}>{track.fileFormat.toUpperCase()}</strong></span>}
            {track.bitrate && <span style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>Bitrate: <strong style={{ color: "var(--text-2)" }}>{track.bitrate} kbps</strong></span>}
            {track.sampleRate && <span style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>Sample rate: <strong style={{ color: "var(--text-2)" }}>{track.sampleRate} Hz</strong></span>}
            {track.channels && <span style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>Canales: <strong style={{ color: "var(--text-2)" }}>{track.channels === 2 ? "Stereo" : "Mono"}</strong></span>}
            {track.fileSize && <span style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>Tamaño: <strong style={{ color: "var(--text-2)" }}>{(track.fileSize / 1_000_000).toFixed(1)} MB</strong></span>}
          </div>
        </div>
      )}

      {error && <p style={{ fontSize: "0.84rem", color: "var(--orange)", marginTop: 20 }}>{error}</p>}

      <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
        <button className="zl-btn zl-btn--primary" onClick={handleSave} disabled={status === "saving"}>
          {status === "saving" ? "Guardando…" : status === "saved" ? "✓ Guardado" : "Guardar metadata"}
        </button>
        {track.albumId && (
          <a href={`/dashboard/albums/${track.albumId}`} className="zl-btn zl-btn--ghost">Cancelar</a>
        )}
      </div>
    </div>
  );
}
