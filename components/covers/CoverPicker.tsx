"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface CoverAsset {
  id: string;
  genre_slug: string;
  public_url: string;
  storage_path: string;
}

interface Props {
  albumId:    string;
  genreSlug:  string;
  coverImage: string | null;
}

export function CoverPicker({ albumId, genreSlug, coverImage }: Props) {
  const router = useRouter();
  const [covers, setCovers]     = useState<CoverAsset[]>([]);
  const [loading, setLoading]   = useState(true);
  const [pending, setPending]   = useState<string | null>(null);
  const [saved, setSaved]       = useState<string | null>(coverImage);
  const [saving, setSaving]     = useState(false);
  const [saved_ok, setSavedOk]  = useState(false);

  useEffect(() => {
    fetch(`/api/covers?genre=${genreSlug}`)
      .then(r => r.json())
      .then(d => { setCovers(d.covers ?? []); setLoading(false); });
  }, [genreSlug]);

  const save = async () => {
    if (!pending || pending === saved) return;
    setSaving(true);
    setSavedOk(false);
    const supabase = createClient();

    await Promise.all([
      supabase.from("albums").update({ cover_image: pending }).eq("id", albumId),
      supabase.from("tracks").update({ cover_image: pending }).eq("album_id", albumId),
    ]);

    setSaved(pending);
    setSaving(false);
    setSavedOk(true);
    setTimeout(() => setSavedOk(false), 3000);
    router.refresh();
  };

  const current = pending ?? saved;

  if (loading) return (
    <div style={{ width: 120, height: 120, borderRadius: 16, background: "var(--surface)",
      display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ color: "var(--text-3)", fontSize: "0.75rem" }}>Cargando…</span>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Current cover preview */}
      <div style={{
        width: 120, height: 120, borderRadius: 16, flexShrink: 0, overflow: "hidden",
        background: current ? `url(${current}) center/cover no-repeat` : "var(--surface)",
        border: pending && pending !== saved
          ? "2px solid var(--brand)"
          : "2px solid var(--border)",
      }} />

      {/* Cover grid */}
      {covers.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-3)",
            textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
            Portadas · {genreSlug}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {covers.map(c => (
              <button
                key={c.id}
                onClick={() => setPending(c.public_url)}
                style={{
                  width: 64, height: 64, borderRadius: 10, padding: 0, border: "none",
                  cursor: "pointer", overflow: "hidden", flexShrink: 0,
                  background: `url(${c.public_url}) center/cover no-repeat`,
                  outline: (pending ?? saved) === c.public_url
                    ? "2px solid var(--brand)" : "2px solid transparent",
                  outlineOffset: 2,
                  transition: "outline 0.1s",
                  opacity: saving ? 0.6 : 1,
                }}
              />
            ))}
          </div>

          {/* Save button */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              className="zl-btn zl-btn--primary zl-btn--sm"
              onClick={save}
              disabled={saving || !pending || pending === saved}
              style={{ fontSize: "0.8rem" }}
            >
              {saving ? "Guardando…" : "Guardar portada"}
            </button>
            {saved_ok && (
              <span style={{ fontSize: "0.8rem", color: "var(--brand)" }}>
                ✓ Aplicada al álbum y todos los tracks
              </span>
            )}
          </div>
        </div>
      ) : (
        <p style={{ fontSize: "0.75rem", color: "var(--text-3)", margin: 0 }}>
          No hay portadas para "{genreSlug}" aún.
        </p>
      )}
    </div>
  );
}
