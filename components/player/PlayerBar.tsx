"use client";

import { useState, useCallback } from "react";
import { usePlayer } from "@/lib/player/context";
import { COVERS } from "@/lib/catalog/covers";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(secs: number): string {
  if (!isFinite(secs) || secs < 0) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ── Icons (inline SVG — no extra deps) ───────────────────────────────────────
const Prev = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 6h2v12H6zm3.5 6L20 18V6z" />
  </svg>
);
const Next = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 18l8.5-6L6 6v12zm2.5-6L13 9v6l-4.5-3zm9-6h-2v12h2z" />
  </svg>
);
const Play = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);
const Pause = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);
const ShuffleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17zm4.76-.83l3.62 3.62-3.62 3.62L17 17l5-5-5-5zm-.76 9.83L9.83 13.59 8.41 15l5.17 5.17L15 18.58l-3.62-3.63L14 12.4l3.63 3.63L19 14.58l-5-5-5 5 1.41 1.41z" />
  </svg>
);
const RepeatAllIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
  </svg>
);
const RepeatOneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z" />
  </svg>
);
const QueueIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18A3 3 0 1 0 19 17V8h3V6h-5z" />
  </svg>
);
const VolumeIcon = ({ muted, volume }: { muted: boolean; volume: number }) => {
  if (muted || volume === 0) return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-3-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0 0 17.73 19L19 20.27 20.27 19 5.27 4 4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
    </svg>
  );
  if (volume < 0.5) return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.5 12A4.5 4.5 0 0 0 16 7.97v8.05A4.478 4.478 0 0 0 18.5 12zM5 9v6h4l5 5V4L9 9H5z" />
    </svg>
  );
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05A4.478 4.478 0 0 0 16.5 12zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
};

// ── Slider (range input with custom track fill) ───────────────────────────────
function Slider({
  value, max, onChange, onSeekStart, onSeekEnd,
  thin = false, color = "var(--brand)",
}: {
  value: number; max: number;
  onChange: (v: number) => void;
  onSeekStart?: () => void;
  onSeekEnd?: (v: number) => void;
  thin?: boolean;
  color?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ position: "relative", width: "100%", height: thin ? 12 : 16, display: "flex", alignItems: "center" }}>
      {/* Track */}
      <div style={{ position: "absolute", left: 0, right: 0, height: thin ? 2 : 3, background: "rgba(255,255,255,0.15)", borderRadius: 99 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.1s linear" }} />
      </div>
      <input
        type="range" min={0} max={max} step={max > 1 ? 0.1 : 0.01} value={value}
        onMouseDown={onSeekStart}
        onTouchStart={onSeekStart}
        onChange={e => onChange(Number(e.target.value))}
        onMouseUp={e => onSeekEnd?.(Number((e.target as HTMLInputElement).value))}
        onTouchEnd={e => onSeekEnd?.(Number((e.target as HTMLInputElement).value))}
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          opacity: 0, cursor: "pointer", margin: 0,
          WebkitAppearance: "none",
        }}
      />
    </div>
  );
}

// ── Control button ────────────────────────────────────────────────────────────
function Btn({
  onClick, active = false, children, title, size = 36,
}: {
  onClick: () => void; active?: boolean;
  children: React.ReactNode; title?: string; size?: number;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: size, height: size, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: active ? "rgba(149,249,8,0.12)" : "transparent",
        border: "none", cursor: "pointer",
        color: active ? "var(--brand)" : "rgba(255,255,255,0.65)",
        transition: "color 0.15s, background 0.15s",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

// ── Queue panel ───────────────────────────────────────────────────────────────
function QueuePanel() {
  const p = usePlayer();
  if (!p.showQueue) return null;

  return (
    <div style={{
      position: "fixed", bottom: 80, right: 16,
      width: 320, maxHeight: "60vh",
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 16, overflow: "hidden",
      boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
      zIndex: 99,
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontWeight: 700, fontSize: "0.85rem" }}>Cola ({p.queue.length})</p>
        <button
          onClick={p.clearQueue}
          style={{ fontSize: "0.72rem", color: "var(--text-3)", background: "none", border: "none", cursor: "pointer" }}
        >
          Limpiar
        </button>
      </div>
      {/* Tracks */}
      <div style={{ overflowY: "auto", flex: 1 }}>
        {p.queue.length === 0 && (
          <p style={{ padding: "24px 16px", fontSize: "0.83rem", color: "var(--text-3)", textAlign: "center" }}>
            La cola está vacía
          </p>
        )}
        {p.queue.map((t, i) => {
          const isCurrent = i === p.queueIndex;
          return (
            <div
              key={`${t.id}-${i}`}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px",
                background: isCurrent ? "rgba(149,249,8,0.06)" : "transparent",
                borderLeft: isCurrent ? "2px solid var(--brand)" : "2px solid transparent",
                cursor: "pointer",
              }}
              onClick={() => p.playTrack(t, p.queue)}
            >
              {/* Cover */}
              <div style={{
                width: 36, height: 36, borderRadius: 6, flexShrink: 0,
                background: t.coverImage ? `url(${t.coverImage}) center/cover no-repeat` : COVERS[t.cover],
                fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center",
              }} />
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "0.82rem", fontWeight: isCurrent ? 700 : 400, color: isCurrent ? "var(--brand)" : "var(--text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.title}
                </p>
                <p style={{ fontSize: "0.72rem", color: "var(--text-3)", margin: 0 }}>{t.artist}</p>
              </div>
              {/* Duration + remove */}
              <span style={{ fontSize: "0.72rem", color: "var(--text-3)", flexShrink: 0 }}>{t.duration}</span>
              <button
                onClick={e => { e.stopPropagation(); p.removeFromQueue(i); }}
                style={{ color: "var(--text-3)", background: "none", border: "none", cursor: "pointer", fontSize: "1rem", lineHeight: 1, padding: 4, flexShrink: 0 }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── PlayerBar ─────────────────────────────────────────────────────────────────
export function PlayerBar() {
  const p = usePlayer();
  const [isSeeking, setIsSeeking]   = useState(false);
  const [seekValue, setSeekValue]   = useState(0);

  const onSeekStart = useCallback(() => {
    setIsSeeking(true);
    setSeekValue(p.currentTime);
  }, [p.currentTime]);

  const onSeekEnd = useCallback((v: number) => {
    p.seek(v);
    setIsSeeking(false);
  }, [p]);

  const displayTime = isSeeking ? seekValue : p.currentTime;

  const visible = !!p.track;

  return (
    <>
      <QueuePanel />

      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
        background: "rgba(13,13,13,0.96)",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid var(--border)",
        height: 80,
        transform: visible ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
        display: "flex", flexDirection: "column",
      }}>
        {/* Progress bar — full width at top */}
        <div style={{ height: 3, flexShrink: 0, padding: "0 0" }}>
          <Slider
            value={displayTime}
            max={p.duration || 0}
            onChange={setSeekValue}
            onSeekStart={onSeekStart}
            onSeekEnd={onSeekEnd}
            thin
          />
        </div>

        {/* Main row */}
        <div style={{
          flex: 1, display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          padding: "0 16px",
          gap: 12,
        }}>

          {/* Left: track info */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            {p.track && (
              <>
                <div style={{
                  width: 44, height: 44, borderRadius: 8, flexShrink: 0,
                  background: p.track.coverImage
                    ? `url(${p.track.coverImage}) center/cover no-repeat`
                    : COVERS[p.track.cover],
                  position: "relative", overflow: "hidden",
                }}>
                  {(p.isLoading || p.hasError) && (
                    <div style={{
                      position: "absolute", inset: 0,
                      background: "rgba(0,0,0,0.55)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.75rem",
                    }}>
                      {p.hasError ? "!" : "…"}
                    </div>
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: "0.85rem", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)" }}>
                    {p.track.title}
                  </p>
                  <p style={{ fontSize: "0.74rem", color: p.hasError ? "var(--orange)" : "var(--text-3)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.hasError ? "Error al cargar — saltando…" : p.track.artist}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Center: playback controls */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Btn onClick={p.toggleShuffle} active={p.shuffle} title="Aleatorio">
                <ShuffleIcon />
              </Btn>
              <Btn onClick={p.previous} title="Anterior" size={36}>
                <Prev />
              </Btn>

              {/* Play / Pause — larger */}
              <button
                onClick={p.togglePlay}
                style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: "var(--brand)", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--brand-ink)",
                  flexShrink: 0,
                  transition: "transform 0.1s",
                }}
              >
                {p.isPlaying ? <Pause /> : <Play />}
              </button>

              <Btn onClick={p.next} title="Siguiente" size={36}>
                <Next />
              </Btn>
              <Btn
                onClick={p.toggleRepeat}
                active={p.repeat !== "none"}
                title={p.repeat === "none" ? "Sin repetición" : p.repeat === "all" ? "Repetir todo" : "Repetir uno"}
              >
                {p.repeat === "one" ? <RepeatOneIcon /> : <RepeatAllIcon />}
              </Btn>
            </div>

            {/* Time display */}
            <div style={{ display: "flex", gap: 6, fontSize: "0.68rem", color: "var(--text-3)" }}>
              <span>{fmt(displayTime)}</span>
              <span>/</span>
              <span>{fmt(p.duration)}</span>
            </div>
          </div>

          {/* Right: volume + queue */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
            <button
              onClick={p.toggleMute}
              style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.55)", flexShrink: 0, padding: 4 }}
            >
              <VolumeIcon muted={p.muted} volume={p.volume} />
            </button>
            <div style={{ width: 88 }}>
              <Slider
                value={p.muted ? 0 : p.volume}
                max={1}
                onChange={p.setVolume}
                color="rgba(255,255,255,0.55)"
                thin
              />
            </div>
            <Btn onClick={p.toggleQueue} active={p.showQueue} title="Cola">
              <QueueIcon />
            </Btn>
          </div>
        </div>
      </div>
    </>
  );
}
