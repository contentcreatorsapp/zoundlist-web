"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  albumId:   string;
  title:     string;
  published: boolean;
}

export function AlbumActions({ albumId, title, published }: Props) {
  const router = useRouter();
  const [isPublished, setIsPublished] = useState(published);
  const [toggling, setToggling]       = useState(false);
  const [showDelete, setShowDelete]   = useState(false);
  const [confirm, setConfirm]         = useState("");
  const [deleting, setDeleting]       = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const togglePublish = async () => {
    setToggling(true);
    setError(null);
    const res = await fetch(`/api/dashboard/albums/${albumId}`, {
      method:  "PATCH",
      headers: { "content-type": "application/json" },
      body:    JSON.stringify({ published: !isPublished }),
    });
    if (res.ok) {
      setIsPublished(p => !p);
      router.refresh();
    } else {
      const d = await res.json();
      setError(d.error ?? "Error");
    }
    setToggling(false);
  };

  const deleteAlbum = async () => {
    if (confirm !== title) return;
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/dashboard/albums/${albumId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard");
    } else {
      const d = await res.json();
      setError(d.error ?? "Error al eliminar");
      setDeleting(false);
    }
  };

  return (
    <div style={{ marginTop: 32, borderTop: "1px solid var(--border)", paddingTop: 24 }}>
      <p style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-3)",
        textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
        Gestión del álbum
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 480 }}>
        {/* Toggle publish */}
        <div className="zl-card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: "0.9rem", margin: "0 0 2px" }}>
              {isPublished ? "Álbum publicado" : "Álbum en borrador"}
            </p>
            <p style={{ fontSize: "0.78rem", color: "var(--text-3)", margin: 0 }}>
              {isPublished
                ? "Visible en el catálogo público."
                : "Oculto del catálogo. Solo tú puedes verlo."}
            </p>
          </div>
          <button
            className={`zl-btn zl-btn--sm ${isPublished ? "zl-btn--ghost" : "zl-btn--primary"}`}
            onClick={togglePublish}
            disabled={toggling}
            style={{ flexShrink: 0, fontSize: "0.8rem" }}
          >
            {toggling ? "…" : isPublished ? "Despublicar" : "Publicar"}
          </button>
        </div>

        {/* Delete */}
        <div className="zl-card" style={{ padding: "16px 20px", borderColor: "rgba(255,100,60,0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: "0.9rem", margin: "0 0 2px" }}>Eliminar álbum</p>
              <p style={{ fontSize: "0.78rem", color: "var(--text-3)", margin: 0 }}>
                Borra el álbum, todos sus tracks y archivos de audio. Irreversible.
              </p>
            </div>
            <button
              className="zl-btn zl-btn--sm zl-btn--ghost"
              onClick={() => setShowDelete(s => !s)}
              style={{ flexShrink: 0, fontSize: "0.8rem", color: "var(--orange)", borderColor: "rgba(255,100,60,0.3)" }}
            >
              {showDelete ? "Cancelar" : "Eliminar"}
            </button>
          </div>

          {showDelete && (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontSize: "0.8rem", color: "var(--text-2)", margin: 0 }}>
                Escribe <strong style={{ color: "var(--text)" }}>{title}</strong> para confirmar:
              </p>
              <input
                type="text"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder={title}
                style={{
                  background: "var(--bg)", border: "1px solid var(--border)",
                  borderRadius: 8, padding: "8px 12px", color: "var(--text)",
                  fontSize: "0.85rem", outline: "none", width: "100%",
                }}
              />
              <button
                className="zl-btn zl-btn--sm"
                onClick={deleteAlbum}
                disabled={confirm !== title || deleting}
                style={{
                  background: confirm === title ? "var(--orange)" : "rgba(255,100,60,0.15)",
                  color: confirm === title ? "#fff" : "var(--text-3)",
                  border: "none", fontSize: "0.8rem", alignSelf: "flex-start",
                }}
              >
                {deleting ? "Eliminando…" : "Confirmar eliminación"}
              </button>
            </div>
          )}
        </div>

        {error && (
          <p style={{ fontSize: "0.8rem", color: "var(--orange)", margin: 0 }}>{error}</p>
        )}
      </div>
    </div>
  );
}
