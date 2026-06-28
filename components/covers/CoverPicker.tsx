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
  albumId:      string;
  genreSlug:    string;
  coverImage:   string | null;
}

export function CoverPicker({ albumId, genreSlug, coverImage }: Props) {
  const router = useRouter();
  const [covers, setCovers]       = useState<CoverAsset[]>([]);
  const [selected, setSelected]   = useState<string | null>(coverImage);
  const [saving, setSaving]       = useState(false);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    fetch(`/api/covers?genre=${genreSlug}`)
      .then(r => r.json())
      .then(d => { setCovers(d.covers ?? []); setLoading(false); });
  }, [genreSlug]);

  const pick = async (url: string) => {
    if (url === selected) return;
    setSelected(url);
    setSaving(true);
    const supabase = createClient();
    await supabase.from("albums").update({ cover_image: url }).eq("id", albumId);
    setSaving(false);
    router.refresh();
  };

  if (loading) return (
    <div style={{ width: 120, height: 120, borderRadius: 16, background: "var(--surface)",
      display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ color: "var(--text-3)", fontSize: "0.75rem" }}>Cargando…</span>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Current cover */}
      <div style={{
        width: 120, height: 120, borderRadius: 16, flexShrink: 0, overflow: "hidden",
        background: selected ? `url(${selected}) center/cover no-repeat` : "var(--surface)",
        border: "2px solid var(--border)",
        position: "relative",
      }}>
        {saving && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "var(--brand)", fontSize: "0.7rem" }}>Guardando…</span>
          </div>
        )}
      </div>

      {/* Cover grid */}
      {covers.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <p style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-3)",
            textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
            Portadas · {genreSlug}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {covers.map(c => (
              <button
                key={c.id}
                onClick={() => pick(c.public_url)}
                style={{
                  width: 64, height: 64, borderRadius: 10, padding: 0, border: "none",
                  cursor: "pointer", overflow: "hidden", flexShrink: 0,
                  background: `url(${c.public_url}) center/cover no-repeat`,
                  outline: selected === c.public_url
                    ? "2px solid var(--brand)" : "2px solid transparent",
                  outlineOffset: 2,
                  transition: "outline 0.1s",
                }}
              />
            ))}
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
