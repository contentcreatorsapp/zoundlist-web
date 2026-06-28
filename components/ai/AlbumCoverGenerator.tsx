"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COVERS } from "@/lib/catalog/covers";
import type { CoverVariant } from "@/types/catalog";

interface Props {
  albumId:    string;
  cover:      CoverVariant;
  coverImage: string | null;
  glyph:      string;
}

type Phase = "idle" | "generating" | "done" | "error";

export function AlbumCoverGenerator({ albumId, cover, coverImage, glyph }: Props) {
  const router = useRouter();
  const [phase, setPhase]       = useState<Phase>("idle");
  const [newCover, setNewCover] = useState<string | null>(null);
  const [prompt, setPrompt]     = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);

  const generate = async () => {
    setPhase("generating");
    setError(null);
    try {
      const res  = await fetch("/api/ai/generate-album-cover", {
        method:  "POST",
        headers: { "content-type": "application/json" },
        body:    JSON.stringify({ albumId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error generando portada");
      setNewCover(data.coverUrl);
      setPrompt(data.prompt);
      setPhase("done");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setPhase("error");
    }
  };

  const coverStyle = (url: string | null): React.CSSProperties => ({
    width: 120, height: 120, borderRadius: 16, flexShrink: 0, overflow: "hidden",
    background: url ? `url(${url}) center/cover no-repeat` : COVERS[cover],
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem",
    border: "2px solid var(--border)",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}>
      {/* Cover preview */}
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        {/* Current */}
        <div style={coverStyle(coverImage)}>
          {!coverImage && glyph}
        </div>

        {/* Arrow + new cover preview */}
        {phase === "done" && newCover && (
          <>
            <span style={{ color: "var(--brand)", fontSize: "1.2rem", fontWeight: 700 }}>→</span>
            <div style={{ position: "relative" }}>
              <div style={coverStyle(newCover)} />
              <span style={{
                position: "absolute", top: -8, right: -8,
                background: "var(--brand)", color: "var(--brand-ink)",
                fontSize: "0.62rem", fontWeight: 800, padding: "2px 7px",
                borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                ✨ IA
              </span>
            </div>
          </>
        )}

        {/* Generating spinner */}
        {phase === "generating" && (
          <>
            <span style={{ color: "var(--text-3)", fontSize: "1.2rem" }}>→</span>
            <div style={{
              ...coverStyle(null),
              background: "var(--surface)",
              border: "2px dashed var(--border)",
              flexDirection: "column", gap: 8,
            }}>
              <span style={{ fontSize: "1.4rem", animation: "spin 1.5s linear infinite",
                display: "inline-block" }}>◌</span>
              <span style={{ fontSize: "0.65rem", color: "var(--text-3)", textAlign: "center",
                lineHeight: 1.3 }}>Generando…</span>
            </div>
          </>
        )}
      </div>

      {/* Prompt preview */}
      {prompt && phase === "done" && (
        <p style={{ fontSize: "0.72rem", color: "var(--text-3)", maxWidth: 340,
          lineHeight: 1.5, fontStyle: "italic", margin: 0 }}>
          "{prompt.slice(0, 120)}{prompt.length > 120 ? "…" : ""}"
        </p>
      )}

      {/* Error */}
      {error && (
        <p style={{ fontSize: "0.78rem", color: "var(--orange)", margin: 0 }}>{error}</p>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {phase !== "generating" && (
          <button
            className="zl-btn zl-btn--ghost zl-btn--sm"
            onClick={generate}
            style={{ fontSize: "0.78rem" }}
          >
            {phase === "done" ? "🎨 Regenerar portada" : "🎨 Generar portada con IA"}
          </button>
        )}
        {phase === "generating" && (
          <span style={{ fontSize: "0.78rem", color: "var(--text-3)", padding: "5px 0" }}>
            Claude + DALL-E 3 — ~15 segundos…
          </span>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
