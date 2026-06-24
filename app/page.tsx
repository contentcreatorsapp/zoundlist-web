"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Track {
  id: number;
  name: string;
  genre: string;
  emoji: string;
  bpm: number;
  duration: string;
  mood: string;
  key: string;
  tags: string[];
}

interface QueueItem {
  name: string;
  meta: string;
  duration: string;
  tag: string;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const TRACKS: Track[] = [
  { id: 1, name: "Midnight Drive", genre: "cinematic", emoji: "🎬", bpm: 118, duration: "2:43", mood: "Épico", key: "G Min", tags: ["Boda", "Documental", "Viaje"] },
  { id: 2, name: "Morning Light", genre: "lofi", emoji: "☕", bpm: 84, duration: "3:15", mood: "Tranquilo", key: "C Maj", tags: ["Vlog", "Estudio", "Lifestyle"] },
  { id: 3, name: "Corporate Pulse", genre: "corporate", emoji: "💼", bpm: 120, duration: "2:28", mood: "Motivacional", key: "E Min", tags: ["YouTube", "Presentación", "B2B"] },
  { id: 4, name: "Heaven's Gate", genre: "worship", emoji: "✨", bpm: 72, duration: "4:02", mood: "Reverente", key: "D Maj", tags: ["Culto", "Ministerio", "Adoración"] },
  { id: 5, name: "Reel Hook", genre: "social", emoji: "📱", bpm: 128, duration: "0:30", mood: "Energético", key: "A Min", tags: ["Reels", "TikTok", "Shorts"] },
  { id: 6, name: "Deep Focus", genre: "podcast", emoji: "🎙️", bpm: 90, duration: "3:40", mood: "Concentrado", key: "F Maj", tags: ["Podcast", "Intro", "Fondo"] },
  { id: 7, name: "Golden Hour", genre: "cinematic", emoji: "🌅", bpm: 96, duration: "3:20", mood: "Nostálgico", key: "A Maj", tags: ["Boda", "Retrato", "Drone"] },
  { id: 8, name: "Lo-fi Rain", genre: "lofi", emoji: "🌧️", bpm: 78, duration: "2:55", mood: "Melancólico", key: "E Min", tags: ["Vlog", "Estudio", "Stream"] },
  { id: 9, name: "Brand Launch", genre: "corporate", emoji: "🚀", bpm: 126, duration: "2:10", mood: "Ambicioso", key: "B Min", tags: ["Comercial", "Marca", "Ads"] },
];

const HERO_QUEUE: QueueItem[] = [
  { name: "Midnight Drive", meta: "Cinematic · 118 BPM", duration: "2:43", tag: "🎬" },
  { name: "Golden Hour", meta: "Cinematic · 96 BPM", duration: "3:20", tag: "🌅" },
  { name: "Heaven's Gate", meta: "Worship · 72 BPM", duration: "4:02", tag: "✨" },
];

const CARD_GRADIENTS: Record<string, string> = {
  cinematic: "linear-gradient(135deg,rgba(87,35,252,0.4),rgba(87,35,252,0.1))",
  lofi:      "linear-gradient(135deg,rgba(245,166,35,0.3),rgba(245,166,35,0.08))",
  corporate: "linear-gradient(135deg,rgba(30,120,255,0.3),rgba(30,120,255,0.08))",
  worship:   "linear-gradient(135deg,rgba(34,197,94,0.3),rgba(34,197,94,0.08))",
  social:    "linear-gradient(135deg,rgba(236,72,153,0.3),rgba(236,72,153,0.08))",
  podcast:   "linear-gradient(135deg,rgba(139,92,246,0.3),rgba(139,92,246,0.08))",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function randomBars(count: number): number[] {
  return Array.from({ length: count }, () => 8 + Math.random() * 20);
}

// ─── Components ──────────────────────────────────────────────────────────────

function PlayIcon({ playing }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
      {playing
        ? <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
        : <path d="M8 5v14l11-7z" />}
    </svg>
  );
}

function SmallPlayIcon({ playing }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      {playing
        ? <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
        : <path d="M8 5v14l11-7z" />}
    </svg>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function HomePage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [queueIdx, setQueueIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [playingCardId, setPlayingCardId] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [waveBars] = useState(() => randomBars(60));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cardIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [, forceRender] = useState(0);

  const currentTrack = HERO_QUEUE[queueIdx];

  // Hero play/pause
  const startPlay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 1) {
          setQueueIdx(i => (i + 1) % HERO_QUEUE.length);
          return 0;
        }
        return prev + 0.004;
      });
    }, 80);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => {
      if (!prev) startPlay();
      else if (intervalRef.current) clearInterval(intervalRef.current);
      return !prev;
    });
  }, [startPlay]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (cardIntervalRef.current) clearInterval(cardIntervalRef.current);
    };
  }, []);

  // Space bar shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" && (e.target as HTMLElement).tagName !== "INPUT") {
        e.preventDefault();
        togglePlay();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [togglePlay]);

  // Close modal on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const selectQueueItem = (idx: number) => {
    setQueueIdx(idx);
    setProgress(0);
    if (isPlaying) startPlay();
  };

  const toggleCardPlay = (id: number) => {
    if (playingCardId === id) {
      setPlayingCardId(null);
      if (cardIntervalRef.current) clearInterval(cardIntervalRef.current);
    } else {
      setPlayingCardId(id);
      if (cardIntervalRef.current) clearInterval(cardIntervalRef.current);
      cardIntervalRef.current = setInterval(() => forceRender(n => n + 1), 600);
    }
  };

  const handleFormSubmit = () => {
    setFormSubmitted(true);
    setTimeout(() => setModalOpen(false), 2000);
  };

  const elapsed = Math.floor(progress * 163);
  const timeDisplay = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")} / 2:43`;
  const playedBars = Math.floor(progress * 60);

  const filteredTracks = activeFilter === "all"
    ? TRACKS
    : TRACKS.filter(t => t.genre === activeFilter);

  return (
    <>
      {/* ── NAV ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "0 24px",
        background: "rgba(8,11,20,0.85)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, #5723fc, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, flexShrink: 0,
            }}>🎵</div>
            <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
              Sonoris
            </span>
          </a>

          <ul style={{ display: "flex", gap: 28, listStyle: "none" }} className="hidden md:flex">
            <li><a href="#catalog" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "0.9rem", fontWeight: 500 }}>Catálogo</a></li>
            <li><a href="#license" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "0.9rem", fontWeight: 500 }}>Colecciones</a></li>
            <li><a href="#pricing" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "0.9rem", fontWeight: 500 }}>Precios</a></li>
          </ul>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={() => setModalOpen(true)} style={{
              background: "transparent", border: "none", color: "var(--text-secondary)",
              fontFamily: "inherit", fontWeight: 700, fontSize: "0.875rem",
              cursor: "pointer", padding: "9px 20px", borderRadius: 8,
            }}>Iniciar sesión</button>
            <button onClick={() => setModalOpen(true)} style={{
              background: "var(--amber)", border: "none", color: "#080b14",
              fontFamily: "inherit", fontWeight: 700, fontSize: "0.875rem",
              cursor: "pointer", padding: "9px 20px", borderRadius: 8,
              transition: "all 0.2s",
            }}>Empezar gratis</button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", padding: "80px 24px 60px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center", width: "100%" }}
          className="hero-grid">

          {/* Left */}
          <div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "6px 14px", marginBottom: 28,
              background: "var(--amber-dim)",
              border: "1px solid rgba(245,166,35,0.25)", borderRadius: 100,
            }}>
              <div style={{
                width: 6, height: 6, background: "var(--amber)", borderRadius: "50%",
                animation: "pulse-dot 2s ease-in-out infinite",
              }} />
              <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--amber)", letterSpacing: "0.04em" }}>
                150+ tracks · nuevas pistas cada semana
              </span>
            </div>

            <h1 className="display">
              Música para<br /><em>historias reales.</em>
            </h1>

            <p style={{ fontSize: "1.15rem", color: "var(--text-secondary)", margin: "20px 0 36px", maxWidth: 480, lineHeight: 1.65 }}>
              Música cinematográfica, editorial y ambient creada con IA y curada a mano.
              Para video, podcast, iglesias y marcas.
              Descarga con confianza — cada track incluye licencia lista para usar.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={() => setModalOpen(true)} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "13px 28px", borderRadius: 14,
                background: "var(--amber)", border: "none", color: "#080b14",
                fontFamily: "inherit", fontWeight: 700, fontSize: "0.95rem",
                cursor: "pointer", transition: "all 0.2s",
              }}>Explorar el catálogo →</button>
              <button
                onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
                style={{
                  display: "inline-flex", alignItems: "center",
                  padding: "13px 28px", borderRadius: 14,
                  background: "transparent",
                  border: "1px solid var(--border-glow)",
                  color: "var(--text-secondary)",
                  fontFamily: "inherit", fontWeight: 700, fontSize: "0.95rem",
                  cursor: "pointer",
                }}>Ver planes</button>
            </div>

            <div style={{ marginTop: 40, display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ display: "flex" }}>
                {["🎬", "🎙️", "⛪", "📱"].map((e, i) => (
                  <div key={i} style={{
                    width: 32, height: 32, borderRadius: "50%",
                    border: "2px solid var(--void)",
                    marginLeft: i === 0 ? 0 : -8,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "var(--surface)", fontSize: 14,
                  }}>{e}</div>
                ))}
              </div>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                Usado por <strong style={{ color: "var(--text-secondary)" }}>videógrafos, podcasters, iglesias</strong> y agencias
              </p>
            </div>
          </div>

          {/* Right — Player */}
          <div style={{ position: "relative" }}>
            <div style={{
              background: "var(--deep)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-xl)",
              padding: 28,
              position: "relative",
              overflow: "hidden",
            }}>
              {/* top glow line */}
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 1,
                background: "linear-gradient(90deg, transparent, rgba(87,35,252,0.5), transparent)",
              }} />

              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>
                    {currentTrack.name}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 4 }}>
                    {currentTrack.meta}
                  </div>
                </div>
                <div style={{
                  padding: "4px 10px",
                  background: "var(--purple-dim)",
                  border: "1px solid rgba(87,35,252,0.2)",
                  borderRadius: 100, fontSize: "0.72rem", fontWeight: 600, color: "#a78bfa",
                }}>
                  {currentTrack.tag} Cinematic
                </div>
              </div>

              {/* Waveform */}
              <div
                onClick={togglePlay}
                style={{ display: "flex", alignItems: "center", gap: 3, height: 80, margin: "16px 0", cursor: "pointer" }}
                role="button"
                aria-label={isPlaying ? "Pausar" : "Reproducir"}
              >
                {waveBars.map((h, i) => (
                  <div key={i} style={{
                    flex: 1, height: h, borderRadius: 2,
                    background: i < playedBars - 1
                      ? "linear-gradient(180deg, #5723fc, #8b5cf6)"
                      : i === playedBars
                        ? "var(--amber)"
                        : "var(--border-glow)",
                    animation: i === playedBars && isPlaying ? "wave-active 0.4s ease-in-out infinite alternate" : "none",
                  }} />
                ))}
              </div>

              {/* Controls */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button onClick={togglePlay} style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: "var(--purple)", border: "none",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.2s",
                  }}
                    aria-label={isPlaying ? "Pausar" : "Reproducir"}>
                    <PlayIcon playing={isPlaying} />
                  </button>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", minWidth: 72 }}>
                    {timeDisplay}
                  </span>
                </div>
                <button onClick={() => setModalOpen(true)} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 14px",
                  background: "var(--amber-dim)",
                  border: "1px solid rgba(245,166,35,0.2)",
                  borderRadius: 8, fontSize: "0.78rem", fontWeight: 600,
                  color: "var(--amber)", cursor: "pointer",
                  fontFamily: "inherit",
                }}>🔒 Descargar</button>
              </div>

              {/* Queue */}
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                {HERO_QUEUE.map((t, i) => (
                  <div key={i} onClick={() => selectQueueItem(i)} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px", borderRadius: 8, cursor: "pointer",
                    background: i === queueIdx ? "var(--purple-dim)" : "transparent",
                    border: `1px solid ${i === queueIdx ? "rgba(87,35,252,0.2)" : "transparent"}`,
                    transition: "all 0.15s",
                  }}
                    role="button"
                    aria-label={`Reproducir ${t.name}`}>
                    <div style={{
                      fontSize: "0.75rem",
                      color: i === queueIdx ? "var(--amber)" : "var(--text-muted)",
                      width: 18, textAlign: "center", flexShrink: 0,
                    }}>
                      {i === queueIdx && isPlaying ? "▶" : i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.tag} {t.name}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{t.meta}</div>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", flexShrink: 0 }}>{t.duration}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <div style={{ padding: "28px 24px", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 48, flexWrap: "wrap" }}>
          {[
            { icon: "⚡", text: "Curación humana · sin loops, sin artefactos" },
            { icon: "🎵", text: "Cinematic · Lo-fi · Worship · Corporate · Podcast" },
            { icon: "✅", text: "Licencia incluida en cada descarga" },
            { icon: "↩️", text: "Cancela cuando quieras" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-muted)", fontSize: "0.82rem", fontWeight: 500 }}>
              <span style={{ color: "#4ade80" }}>{item.icon}</span>
              {item.text}
            </div>
          ))}
        </div>
      </div>

      {/* ── CATALOG ── */}
      <section id="catalog" style={{ padding: "100px 24px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span className="label-tag" style={{ display: "block", marginBottom: 12 }}>Escucha antes de decidir</span>
            <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 16 }}>
              Música hecha para proyectos reales
            </h2>
            <p style={{ color: "var(--text-secondary)", maxWidth: 520, margin: "0 auto", fontSize: "1rem" }}>
              Cada pista fue escuchada y aprobada por productores con criterio editorial.
              Si no le pondríamos a un proyecto de cliente, no está en el catálogo.{" "}
              <strong style={{ color: "var(--text-primary)" }}>Nuevas pistas cada semana.</strong>
            </p>
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 40 }}>
            {[
              { label: "Todo", value: "all" },
              { label: "Cinematic", value: "cinematic" },
              { label: "Documentary", value: "corporate" },
              { label: "Real Estate", value: "lofi" },
              { label: "Worship", value: "worship" },
              { label: "Social Media", value: "social" },
              { label: "Podcast", value: "podcast" },
              { label: "Corporate", value: "corporate" },
            ].map((f, i) => (
              <button key={i} onClick={() => setActiveFilter(f.value)} style={{
                padding: "7px 18px", borderRadius: 100,
                border: `1px solid ${activeFilter === f.value ? "rgba(87,35,252,0.35)" : "var(--border)"}`,
                background: activeFilter === f.value ? "var(--purple-dim)" : "transparent",
                color: activeFilter === f.value ? "#a78bfa" : "var(--text-secondary)",
                fontFamily: "inherit", fontSize: "0.82rem", fontWeight: 500,
                cursor: "pointer", transition: "all 0.15s",
              }}>{f.label}</button>
            ))}
          </div>

          {/* Track Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {filteredTracks.map(track => {
              const isCardPlaying = playingCardId === track.id;
              const miniBarHeights = randomBars(24);
              return (
                <div key={track.id} onClick={() => toggleCardPlay(track.id)} style={{
                  background: isCardPlaying
                    ? "linear-gradient(135deg, var(--deep), rgba(87,35,252,0.06))"
                    : "var(--deep)",
                  border: `1px solid ${isCardPlaying ? "rgba(87,35,252,0.4)" : "var(--border)"}`,
                  borderRadius: "var(--radius-lg)",
                  padding: 20, cursor: "pointer",
                  transition: "all 0.2s",
                }}
                  role="button"
                  aria-label={`${isCardPlaying ? "Pausar" : "Reproducir"} ${track.name}`}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 10,
                      background: CARD_GRADIENTS[track.genre] || CARD_GRADIENTS.cinematic,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 22, flexShrink: 0,
                    }}>{track.emoji}</div>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: "var(--surface)",
                      border: "1px solid var(--border-glow)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", color: "var(--text-secondary)",
                    }}>
                      <SmallPlayIcon playing={isCardPlaying} />
                    </div>
                  </div>

                  <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--text-primary)", marginBottom: 8 }}>
                    {track.name}
                  </div>

                  <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                    {[`🎵 ${track.bpm} BPM`, `⏱ ${track.duration}`, `🎼 ${track.key}`].map((m, i) => (
                      <span key={i} style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{m}</span>
                    ))}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {[track.mood, ...track.tags].map((tag, i) => (
                      <span key={i} style={{
                        padding: "3px 9px", borderRadius: 100,
                        fontSize: "0.68rem", fontWeight: 500,
                        background: "var(--surface)",
                        color: "var(--text-muted)",
                        border: "1px solid var(--border)",
                      }}>{tag}</span>
                    ))}
                  </div>

                  {/* Mini waveform */}
                  <div style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 14, height: 28 }}>
                    {miniBarHeights.map((h, i) => (
                      <div key={i} style={{
                        flex: 1, height: h, borderRadius: 1,
                        background: isCardPlaying
                          ? (i % 3 === 0 ? "var(--purple)" : "rgba(87,35,252,0.4)")
                          : "var(--border-glow)",
                      }} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CERTIFICATE SECTION ── */}
      <section id="license" style={{
        padding: "100px 24px",
        background: "linear-gradient(180deg, transparent, rgba(87,35,252,0.04), transparent)",
        position: "relative", zIndex: 1,
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}
          className="cert-grid">

          {/* Certificate mockup */}
          <div style={{ background: "var(--deep)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: 32, position: "relative", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, paddingBottom: 20, borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontWeight: 700, fontSize: "1rem" }}>🎵 Sonoris</span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Certificado de Licencia</span>
            </div>
            {[
              ["N° de Certificado", "SNR-2026-00847"],
              ["Licenciatario", "Tu nombre aquí"],
              ["Track", "Midnight Drive"],
              ["ID de Track", "TRK-00291"],
              ["Generado con", "Udio v3 (lic. activa)"],
              ["Plan", "Creator"],
              ["Fecha", "23 jun 2026"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(30,38,64,0.6)", fontSize: "0.82rem" }}>
                <span style={{ color: "var(--text-muted)" }}>{k}</span>
                <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: 20, padding: 16, background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8 }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#4ade80", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                Alcance de Licencia — Digital
              </div>
              {["YouTube y plataformas de video", "Instagram, TikTok, Facebook, X", "Podcast y contenido de audio", "Transmisiones en vivo"].map(item => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", color: "var(--text-secondary)", padding: "3px 0" }}>
                  <span style={{ color: "#4ade80" }}>✓</span> {item}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 14px", background: "var(--amber-dim)",
                border: "1px solid rgba(245,166,35,0.2)", borderRadius: 100,
                fontSize: "0.75rem", fontWeight: 600, color: "var(--amber)",
              }}>✦ Licencia Perpetua para proyectos publicados</span>
            </div>
          </div>

          {/* Right text */}
          <div>
            <span className="label-tag" style={{ display: "block", marginBottom: 12 }}>Descarga con tranquilidad</span>
            <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 16 }}>
              Descarga hoy.<br />Publica mañana.<br />Sin preocupaciones.
            </h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 28 }}>
              Cada descarga incluye un certificado de licencia generado automáticamente.
              Guárdalo en el expediente del proyecto. Si alguna vez necesitas demostrar
              que la música está en orden, ya lo tienes.
            </p>

            {[
              { icon: "📄", title: "Sale solo. Sin pedirlo.", desc: "Cada descarga genera su certificado automáticamente. Un PDF con todo lo que necesitas para el expediente del proyecto." },
              { icon: "🔍", title: "Sabemos qué hay en cada pista", desc: "Qué herramienta la generó, cuándo, con qué acuerdos vigentes. Todo documentado. Nada a ciegas." },
              { icon: "🛡️", title: "Lo que publicas queda tuyo", desc: "El contenido que subes mientras tienes plan activo sigue licenciado aunque canceles. Sin fecha de vencimiento para lo ya publicado." },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 16 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: "var(--amber-dim)",
                  border: "1px solid rgba(245,166,35,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, flexShrink: 0,
                }}>{icon}</div>
                <div>
                  <h4 style={{ fontSize: "0.88rem", fontWeight: 700, marginBottom: 3 }}>{title}</h4>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.5 }}>{desc}</p>
                </div>
              </div>
            ))}

            <button onClick={() => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" })} style={{
              display: "inline-flex", alignItems: "center",
              padding: "13px 28px", borderRadius: 14,
              background: "var(--amber)", border: "none", color: "#080b14",
              fontFamily: "inherit", fontWeight: 700, fontSize: "0.95rem",
              cursor: "pointer", marginTop: 12,
            }}>Explorar el catálogo →</button>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: "80px 24px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{
            background: "var(--deep)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-xl)", padding: 48,
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center",
          }} className="ai-grid">
            <div>
              <span className="label-tag" style={{ display: "block", marginBottom: 12 }}>Cómo funciona Sonoris</span>
              <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 16 }}>
                Creada con IA.<br />Curada con criterio.
              </h2>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 24 }}>
                Cada pista pasa por dos filtros antes de llegar al catálogo: los algoritmos que la crean
                y los oídos que la aprueban. Si no suena bien en un proyecto real, no entra.
              </p>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                {[
                  { num: "150+", label: "Pistas en catálogo" },
                  { num: "6", label: "Colecciones" },
                  { num: "∞", label: "Nuevas cada semana" },
                ].map(({ num, label }) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "1.8rem", fontWeight: 700, letterSpacing: "-0.03em" }}>{num}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { bg: "var(--purple-dim)", icon: "🎛️", title: "Herramientas con acuerdos formales", desc: "Trabajamos solo con plataformas de IA que tienen acuerdos vigentes con la industria musical. No improvisamos." },
                { bg: "var(--amber-dim)", icon: "👂", title: "Cada pista pasa por oídos humanos", desc: "Antes de publicarse, un productor la escucha. Si hay loops, artefactos o algo que no suena profesional, no entra." },
                { bg: "rgba(34,197,94,0.1)", icon: "📋", title: "Cada pista tiene su historia documentada", desc: "Herramienta, fecha, parámetros. Lo guardamos para que tú no tengas que preocuparte si alguien pregunta." },
              ].map(({ bg, icon, title, desc }) => (
                <div key={title} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 16px", background: "var(--surface)",
                  border: "1px solid var(--border)", borderRadius: "var(--radius)",
                }}>
                  <div style={{ width: 38, height: 38, borderRadius: 8, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                    {icon}
                  </div>
                  <div>
                    <h4 style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: 2 }}>{title}</h4>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.4 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding: "100px 24px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span className="label-tag" style={{ display: "block", marginBottom: 12 }}>Precios</span>
            <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 16 }}>Elige tu plan</h2>
            <p style={{ color: "var(--text-secondary)" }}>Empieza gratis. Escucha todo el catálogo antes de decidir.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }} className="pricing-grid">
            {[
              {
                tier: "Free", color: "var(--text-muted)", price: "$0", period: "/mes", yearly: "\u00a0",
                desc: "Escucha el catálogo completo sin compromiso. Sin tarjeta de crédito.",
                features: [
                  { ok: true, text: "Preview de 30 seg de todos los tracks" },
                  { ok: false, text: "Descarga de tracks" },
                  { ok: false, text: "Certificado de licencia" },
                  { ok: false, text: "Uso comercial" },
                ],
                cta: "Explorar gratis", ctaStyle: "outline", featured: false,
              },
              {
                tier: "Creator", color: "#a78bfa", price: "$9", period: "/mes",
                yearly: "$7/mes con plan anual · ahorra $24",
                desc: "Para creadores que publican contenido de forma regular y necesitan música nueva constantemente.",
                features: [
                  { ok: true, text: "Catálogo completo en MP3" },
                  { ok: true, text: "Descargas ilimitadas" },
                  { ok: true, text: "Certificado de licencia PDF" },
                  { ok: true, text: "YouTube, Podcast, RRSS" },
                  { ok: false, text: "Descarga en WAV (lossless)" },
                  { ok: false, text: "Anuncios digitales pagados" },
                ],
                cta: "Empezar con Creator", ctaStyle: "primary", featured: true,
              },
              {
                tier: "Pro", color: "var(--amber)", price: "$19", period: "/mes",
                yearly: "$15/mes con plan anual · ahorra $48",
                desc: "Para videógrafos y agencias que entregan proyectos a clientes y necesitan calidad lossless sin negociar.",
                features: [
                  { ok: true, text: "Todo lo de Creator" },
                  { ok: true, text: "Descarga en WAV (lossless)" },
                  { ok: true, text: "Licencia Comercial completa" },
                  { ok: true, text: "Anuncios digitales pagados" },
                  { ok: true, text: "Videos corporativos y apps" },
                  { ok: true, text: "Prioridad en nuevos tracks" },
                ],
                cta: "Empezar con Pro", ctaStyle: "outline", featured: false,
              },
              {
                tier: "Iglesias / ONGs", color: "var(--green)", price: "$5", period: "/mes",
                yearly: "Plan exclusivo para uso no comercial",
                desc: "Para iglesias y ministerios que producen contenido de culto y necesitan música para sus plataformas digitales.",
                features: [
                  { ok: true, text: "Catálogo completo en MP3" },
                  { ok: true, text: "Descargas ilimitadas" },
                  { ok: true, text: "Certificado de licencia" },
                  { ok: true, text: "Cultos, eventos, streaming" },
                  { ok: false, text: "Uso comercial o publicitario" },
                  { ok: false, text: "WAV o licencia broadcast" },
                ],
                cta: "Plan para iglesias", ctaStyle: "amber", featured: false,
              },
            ].map(plan => (
              <div key={plan.tier} style={{
                background: plan.featured
                  ? "linear-gradient(160deg, var(--deep), rgba(87,35,252,0.08))"
                  : "var(--deep)",
                border: `1px solid ${plan.featured ? "rgba(87,35,252,0.4)" : "var(--border)"}`,
                borderRadius: "var(--radius-lg)",
                padding: "28px 24px",
                display: "flex", flexDirection: "column",
                position: "relative", overflow: "hidden",
              }}>
                {plan.featured && (
                  <>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, var(--purple), #8b5cf6)" }} />
                    <div style={{ position: "absolute", top: -1, right: 20, padding: "4px 12px", background: "var(--purple)", borderRadius: "0 0 8px 8px", fontSize: "0.68rem", fontWeight: 700, color: "#fff", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      POPULAR
                    </div>
                  </>
                )}
                <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: plan.color, marginBottom: 16 }}>
                  {plan.tier}
                </div>
                <div style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: "2.4rem", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}>{plan.price}</span>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{plan.period}</span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--green)", marginBottom: 20, minHeight: 20 }}>{plan.yearly}</div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 24, lineHeight: 1.55, flex: 1 }}>{plan.desc}</p>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 9, marginBottom: 24 }}>
                  {plan.features.map((f, i) => (
                    <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      <span style={{ color: f.ok ? "var(--green)" : "var(--text-muted)", marginTop: 1, flexShrink: 0 }}>{f.ok ? "✓" : "✗"}</span>
                      {f.text}
                    </li>
                  ))}
                </ul>
                <button onClick={() => setModalOpen(true)} style={{
                  width: "100%", padding: 11, borderRadius: 8,
                  fontFamily: "inherit", fontWeight: 700, fontSize: "0.875rem",
                  cursor: "pointer",
                  background: plan.ctaStyle === "primary" ? "var(--purple)"
                    : plan.ctaStyle === "amber" ? "var(--amber-dim)"
                      : "transparent",
                  color: plan.ctaStyle === "primary" ? "#fff"
                    : plan.ctaStyle === "amber" ? "var(--amber)"
                      : "var(--text-secondary)",
                  border: plan.ctaStyle === "outline" ? "1px solid var(--border-glow)"
                    : plan.ctaStyle === "amber" ? "1px solid rgba(245,166,35,0.25)"
                      : "none",
                }}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>

          <p style={{ textAlign: "center", marginTop: 28, fontSize: "0.82rem", color: "var(--text-muted)" }}>
            Todo lo que publicas con tu plan activo queda licenciado para siempre · Cancela cuando quieras · Sin contratos anuales obligatorios
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: "40px 24px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #5723fc, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🎵</div>
            <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>Sonoris</span>
          </a>
          <ul style={{ display: "flex", gap: 24, listStyle: "none" }}>
            {[["Términos de licencia", "#"], ["Privacidad", "#"], ["Términos de uso", "#"], ["Contacto", "#"]].map(([label, href]) => (
              <li key={label}><a href={href} style={{ fontSize: "0.8rem", color: "var(--text-muted)", textDecoration: "none" }}>{label}</a></li>
            ))}
          </ul>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
            © 2026 Sonoris · JM Creativos LLC · Puerto Rico
          </p>
        </div>
      </footer>

      {/* ── MODAL ── */}
      {modalOpen && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}
          style={{
            position: "fixed", inset: 0, background: "rgba(8,11,20,0.85)",
            backdropFilter: "blur(8px)", zIndex: 200,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Registro"
        >
          <div style={{
            background: "var(--deep)", border: "1px solid var(--border-glow)",
            borderRadius: "var(--radius-xl)", padding: 40, maxWidth: 440, width: "100%",
            position: "relative",
          }}>
            <button onClick={() => setModalOpen(false)} style={{
              position: "absolute", top: 16, right: 16,
              background: "var(--surface)", border: "none",
              color: "var(--text-muted)", width: 30, height: 30,
              borderRadius: "50%", cursor: "pointer", fontSize: "1rem",
              display: "flex", alignItems: "center", justifyContent: "center",
            }} aria-label="Cerrar">✕</button>

            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 8 }}>Escucha el catálogo completo</h3>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: 24 }}>
              Crea tu cuenta gratis y accede a todo. Sin tarjeta de crédito, sin compromiso.
            </p>

            {formSubmitted ? (
              <div style={{ textAlign: "center", padding: "20px 0", color: "var(--green)", fontWeight: 700 }}>
                ✓ ¡Listo! Revisa tu email
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Nombre</label>
                  <input type="text" placeholder="Tu nombre" style={{
                    width: "100%", padding: "11px 14px",
                    background: "var(--surface)", border: "1px solid var(--border-glow)",
                    borderRadius: 8, color: "var(--text-primary)",
                    fontFamily: "inherit", fontSize: "0.875rem", outline: "none",
                  }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Email</label>
                  <input type="email" placeholder="tuemail@ejemplo.com" style={{
                    width: "100%", padding: "11px 14px",
                    background: "var(--surface)", border: "1px solid var(--border-glow)",
                    borderRadius: 8, color: "var(--text-primary)",
                    fontFamily: "inherit", fontSize: "0.875rem", outline: "none",
                  }} />
                </div>
                <button onClick={handleFormSubmit} style={{
                  width: "100%", padding: 13,
                  background: "var(--amber)", color: "#080b14",
                  border: "none", borderRadius: 8,
                  fontFamily: "inherit", fontWeight: 700, fontSize: "0.95rem",
                  cursor: "pointer",
                }}>Crear cuenta gratis →</button>
                <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 12 }}>
                  Te enviaremos un link mágico. Sin contraseñas.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
          .cert-grid { grid-template-columns: 1fr !important; }
          .ai-grid   { grid-template-columns: 1fr !important; }
          .pricing-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 600px) {
          .pricing-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
