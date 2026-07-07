"use client";

import { useState } from "react";
import type { ImportedTrackMetadata, AnalyzeResult } from "@/lib/music-import/types";

// ── Styles shared with upload-form.tsx ───────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.75rem", fontWeight: 700,
  color: "var(--text-2)", marginBottom: 6,
  textTransform: "uppercase", letterSpacing: "0.06em",
};

// ── State machine ─────────────────────────────────────────────────────────────
type Phase =
  | "idle"
  | "analyzing"
  | "found"            // metadata found, audio accessible
  | "no-audio"         // metadata found but audio not accessible
  | "importing"
  | "done"
  | "error";

const IMPORT_STAGES = [
  "Descargando audio desde Suno…",
  "Subiendo a Zoundlist Storage…",
  "Creando track en el catálogo…",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function isValidSunoUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return ["suno.com", "www.suno.com", "suno.ai", "www.suno.ai"].includes(u.hostname) &&
           /\/song\/[a-f0-9-]+/i.test(u.pathname);
  } catch { return false; }
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function SpinnerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}
function CheckIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>;
}
function WarnIcon() {
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
}

// ── Component ──────────────────────────────────────────────────────────────────
export function ImportSunoForm({ albumId }: { albumId?: string }) {
  const [url,       setUrl]      = useState("");
  const [phase,     setPhase]    = useState<Phase>("idle");
  const [result,    setResult]   = useState<AnalyzeResult | null>(null);
  const [stageIdx,  setStageIdx] = useState(0);
  const [trackId,   setTrackId]  = useState<string | null>(null);
  const [errMsg,    setErrMsg]   = useState<string | null>(null);
  const [urlError,  setUrlError] = useState<string | null>(null);

  const urlValid   = isValidSunoUrl(url.trim());
  const metadata   = result?.metadata as ImportedTrackMetadata | undefined;

  // ── Analyze ──────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    setUrlError(null);
    if (!url.trim()) { setUrlError("Pega un enlace de Suno primero."); return; }
    if (!urlValid)   { setUrlError("El enlace no parece ser de Suno. Ejemplo: suno.com/song/…"); return; }

    setPhase("analyzing");
    try {
      const res  = await fetch("/api/dashboard/import/analyze", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ url: url.trim() }),
      });
      const data: AnalyzeResult = await res.json();
      setResult(data);

      if (!data.success) {
        setErrMsg(data.error ?? "No se pudo analizar el enlace.");
        setPhase("error");
        return;
      }
      setPhase(data.audioAccessible ? "found" : "no-audio");
    } catch {
      setErrMsg("Error de red al analizar el enlace. Intenta de nuevo.");
      setPhase("error");
    }
  };

  // ── Import ───────────────────────────────────────────────────────────────
  const handleImport = async () => {
    if (!metadata) return;
    setPhase("importing");
    setStageIdx(0);

    // Simulate stage progression while the API call runs
    const intervals = [0, 3000, 6500].map((delay, i) =>
      setTimeout(() => setStageIdx(i), delay)
    );

    try {
      const res  = await fetch("/api/dashboard/import/execute", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ metadata, albumId }),
      });
      intervals.forEach(clearTimeout);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrMsg(data.message ?? data.error ?? "Error durante la importación.");
        setPhase("error");
        return;
      }
      setTrackId(data.trackId);
      setPhase("done");
    } catch {
      intervals.forEach(clearTimeout);
      setErrMsg("Error de red durante la importación. Intenta de nuevo.");
      setPhase("error");
    }
  };

  const handleReset = () => {
    setUrl(""); setPhase("idle"); setResult(null);
    setTrackId(null); setErrMsg(null); setUrlError(null);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 620 }}>

      {/* URL input — visible in idle, found, no-audio */}
      {(phase === "idle" || phase === "found" || phase === "no-audio") && (
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Enlace de Suno</label>
          <p style={{ fontSize: "0.82rem", color: "var(--text-3)", marginBottom: 12 }}>
            Pega el enlace público de una canción de Suno (suno.com/song/…)
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              type="url"
              value={url}
              onChange={e => { setUrl(e.target.value); setUrlError(null); }}
              onKeyDown={e => e.key === "Enter" && phase === "idle" && handleAnalyze()}
              placeholder="https://suno.com/song/…"
              style={{
                flex: 1, background: "var(--surface)", border: `1px solid ${urlError ? "var(--orange)" : "var(--border)"}`,
                borderRadius: 8, padding: "10px 14px", color: "var(--text)",
                fontSize: "0.9rem", outline: "none", fontFamily: "inherit",
              }}
              disabled={phase === "found" || phase === "no-audio"}
            />
            {phase === "idle" && (
              <button
                onClick={handleAnalyze}
                disabled={!url.trim()}
                style={{
                  padding: "10px 20px", background: url.trim() ? "var(--brand)" : "rgba(255,255,255,0.08)",
                  color: url.trim() ? "var(--brand-ink)" : "var(--text-3)",
                  border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.88rem",
                  cursor: url.trim() ? "pointer" : "default", whiteSpace: "nowrap", fontFamily: "inherit",
                }}
              >
                Analizar
              </button>
            )}
            {(phase === "found" || phase === "no-audio") && (
              <button onClick={handleReset}
                style={{ padding: "10px 16px", background: "rgba(255,255,255,0.06)", color: "var(--text-2)", border: "1px solid var(--border)", borderRadius: 8, fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>
                Cambiar
              </button>
            )}
          </div>
          {urlError && <p style={{ fontSize: "0.78rem", color: "var(--orange)", marginTop: 6 }}>{urlError}</p>}
        </div>
      )}

      {/* Analyzing spinner */}
      {phase === "analyzing" && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 0", color: "var(--text-2)" }}>
          <SpinnerIcon />
          <span style={{ fontSize: "0.9rem" }}>Analizando enlace…</span>
        </div>
      )}

      {/* Metadata preview — found or no-audio */}
      {(phase === "found" || phase === "no-audio") && metadata && (
        <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
          {/* Cover + info row */}
          <div style={{ display: "flex", gap: 0 }}>
            {/* Cover art */}
            <div style={{ width: 120, height: 120, flexShrink: 0, background: "var(--surface)", position: "relative" }}>
              {metadata.coverUrl
                ? <img src={metadata.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #22066b, #0f0230)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", opacity: 0.6 }}>🎵</div>
              }
              <span style={{ position: "absolute", bottom: 6, left: 6, fontSize: "0.55rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", background: "rgba(0,0,0,0.8)", color: "#fff", borderRadius: 3, padding: "2px 5px" }}>Suno</span>
            </div>

            {/* Track info */}
            <div style={{ flex: 1, padding: "14px 18px", minWidth: 0 }}>
              <p style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-3)", marginBottom: 5 }}>Canción encontrada</p>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text)", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {metadata.title ?? "Sin título"}
              </h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                {metadata.duration && (
                  <span style={{ fontSize: "0.72rem", color: "var(--text-3)", background: "rgba(255,255,255,0.06)", borderRadius: 4, padding: "2px 7px" }}>
                    {metadata.duration}
                  </span>
                )}
                {metadata.tags.slice(0, 3).map(t => (
                  <span key={t} style={{ fontSize: "0.72rem", color: "var(--text-3)", background: "rgba(255,255,255,0.06)", borderRadius: 4, padding: "2px 7px" }}>
                    {t}
                  </span>
                ))}
              </div>
              {metadata.prompt && (
                <p style={{ fontSize: "0.75rem", color: "var(--text-3)", lineHeight: 1.5, overflow: "hidden", maxHeight: "3em", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                  {metadata.prompt}
                </p>
              )}
            </div>
          </div>

          {/* Audio accessibility notice */}
          {phase === "no-audio" && (
            <div style={{ borderTop: "1px solid var(--border)", padding: "12px 18px", display: "flex", gap: 10, alignItems: "flex-start", background: "rgba(255,122,69,0.06)" }}>
              <span style={{ color: "var(--orange)", flexShrink: 0, marginTop: 1 }}><WarnIcon /></span>
              <div>
                <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-2)", marginBottom: 2 }}>
                  El audio no pudo importarse automáticamente.
                </p>
                <p style={{ fontSize: "0.76rem", color: "var(--text-3)", lineHeight: 1.55 }}>
                  Descarga la canción desde Suno y súbela manualmente usando la pestaña "Upload File".
                </p>
              </div>
            </div>
          )}

          {/* Review note */}
          {phase === "found" && (
            <div style={{ borderTop: "1px solid var(--border)", padding: "10px 18px", background: "rgba(149,249,8,0.04)" }}>
              <p style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>
                ✓ Audio accesible · El track se creará como <strong style={{ color: "var(--text-2)" }}>borrador</strong> para que puedas revisar título, género y metadata antes de publicar.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Importing progress */}
      {phase === "importing" && (
        <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "28px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <SpinnerIcon />
            <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text)" }}>Importando…</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {IMPORT_STAGES.map((stage, i) => (
              <div key={stage} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: i < stageIdx ? "rgba(149,249,8,0.15)" : i === stageIdx ? "rgba(149,249,8,0.1)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${i <= stageIdx ? "rgba(149,249,8,0.4)" : "rgba(255,255,255,0.1)"}`,
                  transition: "all 0.3s",
                }}>
                  {i < stageIdx
                    ? <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="var(--brand)" strokeWidth="2"><polyline points="10 3 5 8 2 5"/></svg>
                    : i === stageIdx
                      ? <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--brand)" }} />
                      : null
                  }
                </div>
                <span style={{ fontSize: "0.82rem", color: i <= stageIdx ? "var(--text-2)" : "var(--text-3)", transition: "color 0.3s" }}>
                  {stage}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Done */}
      {phase === "done" && trackId && (
        <div style={{ border: "1px solid rgba(149,249,8,0.25)", borderRadius: 12, padding: "28px 24px", background: "rgba(149,249,8,0.04)", textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(149,249,8,0.12)", border: "1px solid rgba(149,249,8,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <CheckIcon />
          </div>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
            ¡Importación completada!
          </h3>
          <p style={{ fontSize: "0.82rem", color: "var(--text-3)", marginBottom: 24, lineHeight: 1.6 }}>
            El track fue guardado como borrador. Revisa el título, género y metadata antes de publicar.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <a
              href={`/dashboard/tracks/${trackId}`}
              style={{ padding: "10px 24px", background: "var(--brand)", color: "var(--brand-ink)", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: "0.9rem" }}
            >
              Revisar track →
            </a>
            <button
              onClick={handleReset}
              style={{ padding: "10px 20px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-2)", borderRadius: 8, fontWeight: 600, fontSize: "0.88rem", cursor: "pointer", fontFamily: "inherit" }}
            >
              Importar otra
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {phase === "error" && (
        <div style={{ border: "1px solid rgba(255,122,69,0.3)", borderRadius: 12, padding: "20px 22px", background: "rgba(255,122,69,0.05)" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 16 }}>
            <span style={{ color: "var(--orange)", flexShrink: 0, marginTop: 2 }}><WarnIcon /></span>
            <div>
              <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-2)", marginBottom: 4 }}>Error de importación</p>
              <p style={{ fontSize: "0.8rem", color: "var(--text-3)", lineHeight: 1.55 }}>{errMsg}</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            style={{ padding: "8px 18px", background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", color: "var(--text-2)", borderRadius: 8, fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit" }}
          >
            Intentar de nuevo
          </button>
        </div>
      )}

      {/* CTA actions — idle or found */}
      {phase === "found" && (
        <button
          onClick={handleImport}
          style={{ width: "100%", padding: "13px 0", background: "var(--brand)", color: "var(--brand-ink)", border: "none", borderRadius: 10, fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", fontFamily: "inherit", letterSpacing: "-0.01em" }}
        >
          Importar a Zoundlist
        </button>
      )}

      {/* Help text */}
      {phase === "idle" && (
        <p style={{ fontSize: "0.76rem", color: "var(--text-3)", marginTop: 16, lineHeight: 1.65 }}>
          Solo canciones <strong style={{ color: "var(--text-2)" }}>públicas</strong> de Suno pueden importarse.
          Si el audio no está disponible automáticamente, puedes descargar el archivo desde Suno y subirlo con "Upload File".
        </p>
      )}
    </div>
  );
}
