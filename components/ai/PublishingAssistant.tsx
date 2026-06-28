"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AlbumTrack } from "@/services/albums";
import type { TrackMetadataSuggestion } from "@/lib/ai/types";

// ── Types ──────────────────────────────────────────────────────────────────────
type Phase = "idle" | "generating" | "reviewing" | "applying" | "done";
type GenStatus = "pending" | "analyzing" | "done" | "error";

interface TrackState {
  track:      AlbumTrack;
  status:     GenStatus;
  suggestion: TrackMetadataSuggestion | null;
  error:      string | null;
  edits:      TrackMetadataSuggestion | null;
  publish:    boolean;
}

interface Props {
  albumId: string;
  tracks:  AlbumTrack[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const arrStr = (arr: string[]) => arr.join(", ");
const strArr = (s: string)     => s.split(",").map(x => x.trim()).filter(Boolean);

function ConfidenceBadge({ v }: { v: number }) {
  const pct   = Math.round(v * 100);
  const color = pct >= 85 ? "var(--brand)" : pct >= 70 ? "#f5a623" : "var(--orange)";
  return (
    <span style={{ fontSize: "0.72rem", fontWeight: 700, color, background: `${color}18`,
      padding: "2px 8px", borderRadius: 20 }}>
      {pct}% confianza
    </span>
  );
}

function StatusIcon({ s }: { s: GenStatus }) {
  if (s === "pending")   return <span style={{ opacity: 0.4 }}>○</span>;
  if (s === "analyzing") return <Spinner />;
  if (s === "done")      return <span style={{ color: "var(--brand)" }}>✓</span>;
  return <span style={{ color: "var(--orange)" }}>✗</span>;
}

function Spinner() {
  return (
    <span style={{ display: "inline-block", animation: "spin 1s linear infinite",
      fontSize: "0.9rem" }}>◌</span>
  );
}

// ── Field editor ──────────────────────────────────────────────────────────────
function Field({ label, value, onChange, multiline, number: isNumber }: {
  label:     string;
  value:     string;
  onChange:  (v: string) => void;
  multiline?: boolean;
  number?:   boolean;
}) {
  const base: React.CSSProperties = {
    width: "100%", background: "var(--bg)", border: "1px solid var(--border)",
    borderRadius: 8, color: "var(--text)", fontSize: "0.82rem", padding: "7px 10px",
    resize: "vertical" as const, fontFamily: "inherit",
    outline: "none",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-3)",
        textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </label>
      {multiline
        ? <textarea rows={2} style={base} value={value}
            onChange={e => onChange(e.target.value)} />
        : <input type={isNumber ? "number" : "text"} style={base} value={value}
            onChange={e => onChange(e.target.value)} />
      }
    </div>
  );
}

// ── Track review card ─────────────────────────────────────────────────────────
function TrackReviewCard({ item, onEdit, onTogglePublish }: {
  item:            TrackState;
  onEdit:          (field: keyof TrackMetadataSuggestion, value: unknown) => void;
  onTogglePublish: () => void;
}) {
  const [open, setOpen] = useState(true);
  const s = item.edits!;

  if (item.status === "error") {
    return (
      <div className="zl-card" style={{ padding: "16px 20px", borderColor: "rgba(255,122,69,0.3)" }}>
        <p style={{ fontWeight: 600, marginBottom: 4 }}>{item.track.title}</p>
        <p style={{ fontSize: "0.8rem", color: "var(--orange)" }}>Error: {item.error}</p>
      </div>
    );
  }
  if (!s) return null;

  return (
    <div className="zl-card" style={{ padding: 0, overflow: "hidden",
      borderColor: item.publish ? "rgba(149,249,8,0.3)" : undefined }}>
      {/* Header */}
      <div style={{ padding: "14px 20px", display: "flex", alignItems: "center",
        gap: 12, cursor: "pointer", background: "var(--surface)" }}
        onClick={() => setOpen(o => !o)}>
        <span style={{ flex: 1, fontWeight: 600, fontSize: "0.95rem" }}>
          {item.track.title}
          {s.title !== item.track.title && (
            <span style={{ color: "var(--brand)", marginLeft: 8, fontSize: "0.8rem" }}>
              → {s.title}
            </span>
          )}
        </span>
        <ConfidenceBadge v={s.confidence} />
        <label style={{ display: "flex", alignItems: "center", gap: 6,
          cursor: "pointer", fontSize: "0.8rem", color: "var(--text-2)" }}
          onClick={e => e.stopPropagation()}>
          <input type="checkbox" checked={item.publish}
            onChange={onTogglePublish}
            style={{ accentColor: "var(--brand)", width: 14, height: 14 }} />
          Publicar
        </label>
        <span style={{ color: "var(--text-3)", fontSize: "0.8rem" }}>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div style={{ padding: "16px 20px 20px",
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* Title */}
          <Field label="✨ Título" value={s.title}
            onChange={v => onEdit("title", v)} />
          {/* Subgenre */}
          <Field label="✨ Subgénero" value={s.subgenre ?? ""}
            onChange={v => onEdit("subgenre", v || null)} />
          {/* Description — full width */}
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="✨ Descripción" value={s.description}
              onChange={v => onEdit("description", v)} multiline />
          </div>
          {/* Moods */}
          <Field label="✨ Moods (coma)" value={arrStr(s.moods)}
            onChange={v => onEdit("moods", strArr(v))} />
          {/* Energy */}
          <Field label="✨ Energía (1–10)" value={String(s.energy)}
            onChange={v => onEdit("energy", Math.min(10, Math.max(1, Number(v) || 5)))}
            number />
          {/* BPM */}
          <Field label="✨ BPM" value={s.bpm != null ? String(s.bpm) : ""}
            onChange={v => onEdit("bpm", v ? Number(v) : null)} number />
          {/* Key */}
          <Field label="✨ Tonalidad" value={s.musicalKey ?? ""}
            onChange={v => onEdit("musicalKey", v || null)} />
          {/* Instruments — full width */}
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="✨ Instrumentos (coma)" value={arrStr(s.instruments)}
              onChange={v => onEdit("instruments", strArr(v))} />
          </div>
          {/* Tags — full width */}
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="✨ Tags SEO (coma)" value={arrStr(s.tags)}
              onChange={v => onEdit("tags", strArr(v))} />
          </div>
          {/* Recommended uses — full width */}
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="✨ Usos recomendados (coma)" value={arrStr(s.recommendedUses)}
              onChange={v => onEdit("recommendedUses", strArr(v))} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function PublishingAssistant({ tracks }: Props) {
  const router      = useRouter();
  const cancelRef   = useRef(false);
  const [phase, setPhase]       = useState<Phase>("idle");
  const [items, setItems]       = useState<TrackState[]>([]);
  const [currentIdx, setIdx]    = useState(0);
  const [applyErr, setApplyErr] = useState<string | null>(null);

  const drafts = tracks.filter(t => !t.published);

  // ── Patch helpers ─────────────────────────────────────────────────────────
  const patchItem = (id: string, patch: Partial<TrackState>) =>
    setItems(prev => prev.map(x => x.track.id === id ? { ...x, ...patch } : x));

  // ── Generate ──────────────────────────────────────────────────────────────
  const startGeneration = useCallback(async () => {
    cancelRef.current = false;
    const initial: TrackState[] = drafts.map(t => ({
      track: t, status: "pending", suggestion: null,
      error: null, edits: null, publish: false,
    }));
    setItems(initial);
    setPhase("generating");

    for (let i = 0; i < drafts.length; i++) {
      if (cancelRef.current) break;
      setIdx(i);
      patchItem(drafts[i].id, { status: "analyzing" });

      try {
        const res  = await fetch("/api/ai/generate-track-metadata", {
          method:  "POST",
          headers: { "content-type": "application/json" },
          body:    JSON.stringify({ trackId: drafts[i].id }),
        });
        const data = await res.json();

        if (!res.ok || !data.suggestion) {
          patchItem(drafts[i].id, { status: "error", error: data.error ?? "Error inesperado" });
        } else {
          patchItem(drafts[i].id, {
            status:     "done",
            suggestion: data.suggestion,
            edits:      { ...data.suggestion },
          });
        }
      } catch {
        patchItem(drafts[i].id, { status: "error", error: "Error de red" });
      }
    }

    setPhase("reviewing");
  }, [drafts]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Edit ──────────────────────────────────────────────────────────────────
  const handleEdit = useCallback((trackId: string, field: keyof TrackMetadataSuggestion, value: unknown) => {
    setItems(prev => prev.map(x =>
      x.track.id === trackId && x.edits
        ? { ...x, edits: { ...x.edits, [field]: value } }
        : x
    ));
  }, []);

  const handleTogglePublish = useCallback((trackId: string) => {
    setItems(prev => prev.map(x => x.track.id === trackId ? { ...x, publish: !x.publish } : x));
  }, []);

  const selectAllPublish = (v: boolean) =>
    setItems(prev => prev.map(x => x.status === "done" ? { ...x, publish: v } : x));

  // ── Apply ─────────────────────────────────────────────────────────────────
  const applyAll = useCallback(async () => {
    setPhase("applying");
    setApplyErr(null);
    const supabase = createClient();

    for (const item of items) {
      if (item.status !== "done" || !item.edits) continue;
      const e = item.edits;

      const updates: Record<string, unknown> = {
        description:       e.description   || null,
        subgenre:          e.subgenre       || null,
        musical_key:       e.musicalKey     || null,
        energy:            e.energy,
        instruments:       e.instruments,
        tags:              e.tags,
        recommended_uses:  e.recommendedUses,
        ai_status:         item.publish ? "published" : "reviewed",
        published:         item.publish ? true : undefined,
      };
      // Only update title if AI improved it
      if (e.title && e.title !== item.track.title) updates.title = e.title;
      // Only update BPM if track had none
      if (e.bpm && (!item.track.bpm || item.track.bpm === 0)) updates.bpm = e.bpm;
      // Primary mood (first in array)
      if (e.moods.length > 0 && !item.track.mood) updates.mood = e.moods[0];

      // Remove undefined keys
      Object.keys(updates).forEach(k => updates[k] === undefined && delete updates[k]);

      const { error } = await supabase.from("tracks")
        .update(updates)
        .eq("id", item.track.id);

      if (error) {
        setApplyErr(`Error en "${item.track.title}": ${error.message}`);
        setPhase("reviewing");
        return;
      }
    }

    setPhase("done");
    router.refresh();
  }, [items, router]);

  // ── Render: no drafts ─────────────────────────────────────────────────────
  if (drafts.length === 0) return null;

  const doneCount  = items.filter(x => x.status === "done").length;
  const publishCount = items.filter(x => x.publish).length;

  // ── Render: idle ──────────────────────────────────────────────────────────
  if (phase === "idle") {
    return (
      <div className="zl-card" style={{ padding: "18px 22px", marginBottom: 24,
        borderColor: "rgba(149,249,8,0.2)", background: "rgba(149,249,8,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ fontWeight: 700, fontSize: "0.95rem", margin: "0 0 4px" }}>
              ✨ AI Publishing Assistant
            </p>
            <p style={{ fontSize: "0.82rem", color: "var(--text-2)", margin: 0 }}>
              {drafts.length} track{drafts.length !== 1 ? "s" : ""} en borrador.
              La IA generará título, descripción, tags y más para cada uno.
            </p>
          </div>
          <button className="zl-btn zl-btn--primary" onClick={startGeneration}>
            ✨ Generar metadata con IA
          </button>
        </div>
      </div>
    );
  }

  // ── Render: generating ────────────────────────────────────────────────────
  if (phase === "generating") {
    return (
      <div className="zl-card" style={{ padding: "18px 22px", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <p style={{ fontWeight: 700, fontSize: "0.95rem", margin: 0 }}>
            ✨ Analizando {currentIdx + 1} de {drafts.length}…
          </p>
          <button className="zl-btn zl-btn--ghost zl-btn--sm"
            onClick={() => { cancelRef.current = true; }}>
            Cancelar
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, background: "var(--border)", borderRadius: 2, marginBottom: 16 }}>
          <div style={{
            height: "100%", borderRadius: 2, background: "var(--brand)",
            width: `${Math.round(((currentIdx) / drafts.length) * 100)}%`,
            transition: "width 0.4s ease",
          }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map(item => (
            <div key={item.track.id} style={{ display: "flex", alignItems: "center",
              gap: 10, padding: "9px 12px", background: "var(--bg)", borderRadius: 8,
              fontSize: "0.83rem" }}>
              <span style={{ width: 18, textAlign: "center", flexShrink: 0 }}>
                <StatusIcon s={item.status} />
              </span>
              <span style={{ flex: 1, color: "var(--text-2)", overflow: "hidden",
                textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.track.title}
              </span>
              <span style={{ fontSize: "0.74rem", color: "var(--text-3)", flexShrink: 0 }}>
                {item.status === "pending"   ? "En espera"
                : item.status === "analyzing" ? "Analizando…"
                : item.status === "done"      ? "✓ Listo"
                : `✗ ${item.error ?? "Error"}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Render: applying ──────────────────────────────────────────────────────
  if (phase === "applying") {
    return (
      <div className="zl-card" style={{ padding: "28px 22px", marginBottom: 24, textAlign: "center" }}>
        <Spinner />
        <p style={{ marginTop: 12, color: "var(--text-2)" }}>Aplicando sugerencias…</p>
      </div>
    );
  }

  // ── Render: done ──────────────────────────────────────────────────────────
  if (phase === "done") {
    const applied  = items.filter(x => x.status === "done").length;
    const published = items.filter(x => x.publish).length;
    return (
      <div className="zl-card" style={{ padding: "20px 22px", marginBottom: 24,
        borderColor: "rgba(149,249,8,0.3)" }}>
        <p style={{ fontWeight: 700, fontSize: "0.95rem", margin: "0 0 6px" }}>
          ✓ Metadata aplicada
        </p>
        <p style={{ fontSize: "0.83rem", color: "var(--text-2)", margin: 0 }}>
          {applied} track{applied !== 1 ? "s" : ""} actualizados
          {published > 0 && ` · ${published} publicados`}
        </p>
      </div>
    );
  }

  // ── Render: reviewing ─────────────────────────────────────────────────────
  return (
    <div style={{ marginBottom: 24 }}>
      {/* Review header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12,
        marginBottom: 14, flexWrap: "wrap" }}>
        <p style={{ fontWeight: 700, fontSize: "0.95rem", margin: 0, flex: 1 }}>
          ✨ Revisión — {doneCount} de {items.length} analizados
        </p>
        <button className="zl-btn zl-btn--ghost zl-btn--sm"
          onClick={() => selectAllPublish(true)}>
          Marcar todos para publicar
        </button>
        <button className="zl-btn zl-btn--ghost zl-btn--sm"
          onClick={() => selectAllPublish(false)}>
          Desmarcar todos
        </button>
        <button className="zl-btn zl-btn--primary" onClick={applyAll}
          disabled={doneCount === 0}>
          Aplicar{publishCount > 0 ? ` y publicar ${publishCount}` : " sugerencias"}
        </button>
      </div>

      {applyErr && (
        <p style={{ fontSize: "0.82rem", color: "var(--orange)", marginBottom: 12 }}>
          {applyErr}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map(item => (
          <TrackReviewCard
            key={item.track.id}
            item={item}
            onEdit={(field, value) => handleEdit(item.track.id, field, value)}
            onTogglePublish={() => handleTogglePublish(item.track.id)}
          />
        ))}
      </div>

      {/* Sticky bottom action bar */}
      <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
        <button className="zl-btn zl-btn--ghost"
          onClick={() => setPhase("idle")}>
          ← Volver
        </button>
        <button className="zl-btn zl-btn--primary" onClick={applyAll}
          disabled={doneCount === 0}>
          Aplicar{publishCount > 0 ? ` y publicar ${publishCount}` : " sugerencias"}
        </button>
      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
