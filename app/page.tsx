"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────

interface Track {
  id: number;
  name: string;
  artist: string;
  genre: string;
  cover: CoverVariant;
  glyph: string;
  bpm: number;
  duration: string;
  mood: string;
}

type CoverVariant =
  | "violet" | "lime" | "orange" | "magenta" | "teal" | "gold" | "ice" | "ember";

// ─── Cover art (gradient-mesh "album art", no images needed) ────────────────

const COVERS: Record<CoverVariant, string> = {
  violet:  "radial-gradient(120% 120% at 18% 18%, #8B6BFF 0%, transparent 52%), radial-gradient(120% 120% at 86% 4%, #6E3BFF 0%, transparent 46%), linear-gradient(155deg, #1a1230, #0d0d0d)",
  lime:    "radial-gradient(120% 120% at 82% 16%, #CDFF4F 0%, transparent 46%), radial-gradient(110% 110% at 8% 92%, #4f6f1a 0%, transparent 52%), linear-gradient(155deg, #161a0c, #0d0d0d)",
  orange:  "radial-gradient(120% 120% at 20% 82%, #FF8B3D 0%, transparent 52%), radial-gradient(110% 110% at 92% 10%, #ff4d6d 0%, transparent 46%), linear-gradient(155deg, #20120a, #0d0d0d)",
  magenta: "radial-gradient(120% 120% at 80% 80%, #ff4db8 0%, transparent 50%), radial-gradient(110% 110% at 10% 14%, #7a2bff 0%, transparent 48%), linear-gradient(155deg, #1c0f1e, #0d0d0d)",
  teal:    "radial-gradient(120% 120% at 22% 24%, #2bd6c0 0%, transparent 50%), radial-gradient(110% 110% at 88% 86%, #2b7bff 0%, transparent 48%), linear-gradient(155deg, #0a1a1c, #0d0d0d)",
  gold:    "radial-gradient(120% 120% at 80% 22%, #f7c752 0%, transparent 48%), radial-gradient(110% 110% at 12% 88%, #ff8b3d 0%, transparent 50%), linear-gradient(155deg, #1d160a, #0d0d0d)",
  ice:     "radial-gradient(120% 120% at 24% 18%, #9fd2ff 0%, transparent 50%), radial-gradient(110% 110% at 86% 88%, #8B6BFF 0%, transparent 48%), linear-gradient(155deg, #11161f, #0d0d0d)",
  ember:   "radial-gradient(120% 120% at 78% 76%, #ff5e3d 0%, transparent 50%), radial-gradient(110% 110% at 16% 16%, #ff2d55 0%, transparent 46%), linear-gradient(155deg, #1e0e0c, #0d0d0d)",
};

// ─── Data ──────────────────────────────────────────────────────────────────

const TRACKS: Track[] = [
  { id: 1, name: "Midnight Drive",  artist: "Cinematic",  genre: "cinematic", cover: "violet",  glyph: "🎬", bpm: 118, duration: "2:43", mood: "Épico" },
  { id: 2, name: "Golden Hour",     artist: "Cinematic",  genre: "cinematic", cover: "gold",    glyph: "🌅", bpm: 96,  duration: "3:20", mood: "Nostálgico" },
  { id: 3, name: "Heaven's Gate",   artist: "Worship",    genre: "worship",   cover: "ice",     glyph: "✨", bpm: 72,  duration: "4:02", mood: "Reverente" },
  { id: 4, name: "Morning Light",   artist: "Lo-fi",      genre: "lofi",      cover: "orange",  glyph: "☕", bpm: 84,  duration: "3:15", mood: "Tranquilo" },
  { id: 5, name: "Corporate Pulse", artist: "Corporate",  genre: "corporate", cover: "teal",    glyph: "💼", bpm: 120, duration: "2:28", mood: "Motivacional" },
  { id: 6, name: "Reel Hook",       artist: "Social",     genre: "social",    cover: "magenta", glyph: "📱", bpm: 128, duration: "0:30", mood: "Energético" },
  { id: 7, name: "Deep Focus",      artist: "Podcast",    genre: "podcast",   cover: "violet",  glyph: "🎙️", bpm: 90,  duration: "3:40", mood: "Concentrado" },
  { id: 8, name: "Lo-fi Rain",      artist: "Lo-fi",      genre: "lofi",      cover: "ice",     glyph: "🌧️", bpm: 78,  duration: "2:55", mood: "Melancólico" },
  { id: 9, name: "Brand Launch",    artist: "Corporate",  genre: "corporate", cover: "ember",   glyph: "🚀", bpm: 126, duration: "2:10", mood: "Ambicioso" },
  { id: 10, name: "Neon Skyline",   artist: "Cinematic",  genre: "cinematic", cover: "magenta", glyph: "🌃", bpm: 110, duration: "3:05", mood: "Épico" },
  { id: 11, name: "Quiet Sanctuary", artist: "Worship",   genre: "worship",   cover: "violet",  glyph: "🕊️", bpm: 68,  duration: "4:30", mood: "Reverente" },
  { id: 12, name: "Late Study",     artist: "Lo-fi",      genre: "lofi",      cover: "teal",    glyph: "📚", bpm: 80,  duration: "3:12", mood: "Tranquilo" },
];

const FEATURED = [1, 2, 6, 9, 10, 3].map((id) => TRACKS.find((t) => t.id === id)!);
const TRENDING = [1, 6, 2, 9, 5, 10, 4, 3].map((id) => TRACKS.find((t) => t.id === id)!);
const NEW_MUSIC = [11, 12, 10, 8].map((id) => TRACKS.find((t) => t.id === id)!);
const STAFF_HERO = TRACKS[1]; // Golden Hour
const STAFF_LIST = [3, 7, 5, 12].map((id) => TRACKS.find((t) => t.id === id)!);

const GENRES = [
  { name: "Cinematic", count: 42, cover: "violet" as CoverVariant, glyph: "🎬" },
  { name: "Lo-fi",     count: 31, cover: "orange" as CoverVariant, glyph: "🌧️" },
  { name: "Worship",   count: 28, cover: "ice"    as CoverVariant, glyph: "✨" },
  { name: "Corporate", count: 24, cover: "teal"   as CoverVariant, glyph: "💼" },
  { name: "Social",    count: 36, cover: "magenta" as CoverVariant, glyph: "📱" },
  { name: "Podcast",   count: 19, cover: "gold"   as CoverVariant, glyph: "🎙️" },
];

const MOODS = [
  { name: "Épico",       count: 26, cover: "ember"   as CoverVariant },
  { name: "Tranquilo",   count: 33, cover: "teal"    as CoverVariant },
  { name: "Motivacional", count: 22, cover: "lime"   as CoverVariant },
  { name: "Melancólico", count: 18, cover: "ice"     as CoverVariant },
  { name: "Energético",  count: 29, cover: "magenta" as CoverVariant },
  { name: "Reverente",   count: 15, cover: "violet"  as CoverVariant },
];

const FILTERS = [
  { label: "Todo", value: "all" },
  { label: "Cinematic", value: "cinematic" },
  { label: "Lo-fi", value: "lofi" },
  { label: "Worship", value: "worship" },
  { label: "Corporate", value: "corporate" },
  { label: "Social", value: "social" },
  { label: "Podcast", value: "podcast" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

// Deterministic bars (avoids hydration mismatch + flicker)
function bars(seed: number, n: number): number[] {
  const out: number[] = [];
  let s = (seed * 9301 + 49297) % 233280;
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280;
    out.push(8 + (s / 233280) * 26);
  }
  return out;
}

// ─── Icons ─────────────────────────────────────────────────────────────────

function Play({ size = 18 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor"><path d="M8 5v14l11-7z" /></svg>;
}
function Pause({ size = 18 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>;
}
function Arrow() {
  return <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

// ─── Reusable pieces ─────────────────────────────────────────────────────────

function Cover({ variant, glyph, radius }: { variant: CoverVariant; glyph?: string; radius?: number }) {
  return (
    <div className="zl-cover" style={radius ? { borderRadius: radius } : undefined}>
      <div style={{ position: "absolute", inset: 0, background: COVERS[variant] }} />
      <div className="zl-cover__vignette" />
      {glyph && <span className="zl-cover__glyph">{glyph}</span>}
    </div>
  );
}

function SectionHeader({ eyebrow, title, desc, action }: { eyebrow: string; title: string; desc?: string; action?: string }) {
  return (
    <div className="zl-shead" data-reveal>
      <div>
        <span className="zl-eyebrow">{eyebrow}</span>
        <h2 className="zl-h2" style={{ marginTop: 12 }}>{title}</h2>
        {desc && <p>{desc}</p>}
      </div>
      {action && (
        <a href="#catalog" className="zl-shead__link">{action} <Arrow /></a>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeTrack, setActiveTrack] = useState<number | null>(null);

  // Hero player
  const [isPlaying, setIsPlaying] = useState(false);
  const [queueIdx, setQueueIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const heroQueue = FEATURED.slice(0, 3);
  const current = heroQueue[queueIdx];
  const heroBars = bars(7, 56);

  const startPlay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 1) { setQueueIdx((i) => (i + 1) % heroQueue.length); return 0; }
        return p + 0.004;
      });
    }, 80);
  }, [heroQueue.length]);

  const togglePlay = useCallback(() => {
    setIsPlaying((p) => {
      if (!p) startPlay();
      else if (intervalRef.current) clearInterval(intervalRef.current);
      return !p;
    });
  }, [startPlay]);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  // Nav scroll state
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll reveal
  useEffect(() => {
    const els = document.querySelectorAll("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); } }),
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Keyboard: space toggles, escape closes modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.code === "Space" && tag !== "INPUT" && tag !== "TEXTAREA") { e.preventDefault(); togglePlay(); }
      if (e.key === "Escape") setModalOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [togglePlay]);

  const selectQueue = (i: number) => { setQueueIdx(i); setProgress(0); if (isPlaying) startPlay(); };
  const playedBars = Math.floor(progress * heroBars.length);
  const elapsed = Math.floor(progress * 163);
  const timeDisplay = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")} / ${current.duration}`;

  const handleTrack = (id: number) => setActiveTrack((cur) => (cur === id ? null : id));
  const handleSubmit = () => { setFormSubmitted(true); setTimeout(() => { setModalOpen(false); setFormSubmitted(false); }, 2200); };

  const filtered = activeFilter === "all" ? TRACKS : TRACKS.filter((t) => t.genre === activeFilter);

  return (
    <>
      {/* ── NAV ── */}
      <nav className={`zl-nav${scrolled ? " is-scrolled" : ""}`}>
        <div className="zl-wrap zl-nav__inner">
          <a href="/" className="zl-brand">
            <span className="zl-brand__mark">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="#fff"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3z" /></svg>
            </span>
            <span className="zl-brand__name">Sonoris</span>
          </a>

          <ul className="zl-nav__links zl-hide-md">
            <li><a href="#featured" className="zl-nav__link">Descubrir</a></li>
            <li><a href="#genres" className="zl-nav__link">Géneros</a></li>
            <li><a href="#moods" className="zl-nav__link">Moods</a></li>
            <li><a href="#license" className="zl-nav__link">Licencias</a></li>
            <li><a href="#pricing" className="zl-nav__link">Precios</a></li>
          </ul>

          <div className="zl-nav__actions">
            <button className="zl-nav__login zl-hide-md" onClick={() => setModalOpen(true)}>Iniciar sesión</button>
            <button className="zl-btn zl-btn--primary zl-btn--sm" onClick={() => setModalOpen(true)}>Empezar gratis</button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <header className="zl-section" style={{ paddingTop: 152, paddingBottom: 72 }}>
        <div className="zl-wrap" style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 64, alignItems: "center" }}>
          <div data-reveal>
            <span className="zl-badge" style={{ marginBottom: 26 }}>
              <span className="zl-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--lime)" }} />
              150+ tracks · curación humana cada semana
            </span>
            <h1 className="zl-display">
              Música para<br />lo que estás <em>creando.</em>
            </h1>
            <p className="zl-lead" style={{ margin: "26px 0 34px", maxWidth: 480 }}>
              Una plataforma de descubrimiento musical para video, podcast, iglesias y marcas.
              Curada a mano, cinematográfica, lista para publicar — con licencia incluida en cada descarga.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button className="zl-btn zl-btn--primary" onClick={() => document.getElementById("featured")?.scrollIntoView({ behavior: "smooth" })}>
                Explorar el catálogo <Arrow />
              </button>
              <button className="zl-btn zl-btn--ghost" onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}>
                Ver planes
              </button>
            </div>
            <div style={{ marginTop: 44, display: "flex", gap: 40, flexWrap: "wrap" }}>
              {[["150+", "Tracks curados"], ["6", "Colecciones"], ["∞", "Nuevas cada semana"]].map(([n, l]) => (
                <div key={l}>
                  <div style={{ fontSize: "1.7rem", fontWeight: 700, letterSpacing: "-0.03em" }}>{n}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-3)", marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Featured player */}
          <div data-reveal>
            <div className="zl-card" style={{ padding: 24, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(110,59,255,0.6), transparent)" }} />
              <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 20 }}>
                <div style={{ width: 64, height: 64 }}><Cover variant={current.cover} glyph={current.glyph} radius={14} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-3)", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600 }}>Sonando ahora</div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 700, marginTop: 4 }}>{current.name}</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-2)", marginTop: 2 }}>{current.artist} · {current.bpm} BPM</div>
                </div>
              </div>

              <div className="zl-wave" onClick={togglePlay} role="button" aria-label={isPlaying ? "Pausar" : "Reproducir"}>
                {heroBars.map((h, i) => (
                  <span key={i} style={{
                    height: h,
                    background: i < playedBars ? "linear-gradient(180deg, var(--purple-2), var(--purple))"
                      : i === playedBars ? "var(--lime)" : "rgba(255,255,255,0.12)",
                    transform: i === playedBars && isPlaying ? "scaleY(1.2)" : "none",
                    animation: i === playedBars && isPlaying ? "zl-eq 0.45s ease-in-out infinite alternate" : "none",
                  }} />
                ))}
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <button className="zl-iconbtn zl-play-main" onClick={togglePlay} aria-label={isPlaying ? "Pausar" : "Reproducir"}>
                    {isPlaying ? <Pause /> : <Play />}
                  </button>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}>{timeDisplay}</span>
                </div>
                <button className="zl-btn zl-btn--lime zl-btn--sm" onClick={() => setModalOpen(true)}>Descargar</button>
              </div>

              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 6 }}>
                {heroQueue.map((t, i) => (
                  <div key={t.id} className={`zl-queue-item${i === queueIdx ? " is-active" : ""}`} onClick={() => selectQueue(i)} role="button" aria-label={`Reproducir ${t.name}`}>
                    <span style={{ width: 16, textAlign: "center", fontSize: "0.75rem", color: i === queueIdx ? "var(--lime)" : "var(--text-3)" }}>
                      {i === queueIdx && isPlaying ? "♪" : i + 1}
                    </span>
                    <div style={{ width: 34, height: 34 }}><Cover variant={t.cover} radius={8} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>{t.artist}</div>
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}>{t.duration}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── FEATURED RELEASES ── */}
      <section id="featured" className="zl-section zl-section--tight">
        <div className="zl-wrap">
          <SectionHeader eyebrow="Lanzamientos destacados" title="Estrenos de la semana" desc="Lo nuevo, escogido a mano por nuestro equipo de curación." action="Ver todo" />
          <div className="zl-rail" data-reveal>
            {FEATURED.map((t) => (
              <button key={t.id} className="zl-release" onClick={() => handleTrack(t.id)} aria-label={`Reproducir ${t.name}`}>
                <Cover variant={t.cover} glyph={t.glyph} />
                <span className="zl-release__play"><Play size={18} /></span>
                <div className="zl-release__title">{t.name}</div>
                <div className="zl-release__meta">{t.artist} · {t.mood}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRENDING TRACKS ── */}
      <section className="zl-section zl-section--tight">
        <div className="zl-wrap">
          <SectionHeader eyebrow="En tendencia" title="Lo más sonado ahora" desc="Los tracks que más se están descargando esta semana." action="Explorar catálogo" />
          <div className="zl-tracks" data-reveal>
            {TRENDING.map((t, i) => {
              const playing = activeTrack === t.id;
              return (
                <button key={t.id} className={`zl-track${playing ? " is-playing" : ""}`} onClick={() => handleTrack(t.id)} aria-label={`Reproducir ${t.name}`}>
                  <span className="zl-track__rank">{playing ? <Play size={13} /> : i + 1}</span>
                  <span className="zl-track__cover"><Cover variant={t.cover} glyph={t.glyph} radius={10} /></span>
                  <span style={{ minWidth: 0 }}>
                    <span className="zl-track__title" style={{ display: "block" }}>{t.name}</span>
                    <span className="zl-track__meta" style={{ display: "block" }}>{t.artist} · {t.bpm} BPM · {t.mood}</span>
                  </span>
                  <span className="zl-track__dur">{t.duration}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── STAFF PICKS (editorial) ── */}
      <section className="zl-section">
        <div className="zl-wrap">
          <SectionHeader eyebrow="Selección del equipo" title="Staff Picks" desc="Una pieza destacada y las que la acompañan, elegidas con criterio editorial." />
          <div data-reveal style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 40, alignItems: "stretch" }} className="zl-staff-grid">
            {/* Hero pick */}
            <button className="zl-release" onClick={() => handleTrack(STAFF_HERO.id)} style={{ position: "relative" }} aria-label={`Reproducir ${STAFF_HERO.name}`}>
              <div style={{ position: "relative", borderRadius: "var(--r-lg)", overflow: "hidden", aspectRatio: "16 / 11" }}>
                <div style={{ position: "absolute", inset: 0, background: COVERS[STAFF_HERO.cover] }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 35%, rgba(0,0,0,0.78))" }} />
                <span className="zl-release__play" style={{ width: 56, height: 56 }}><Play size={22} /></span>
                <div style={{ position: "absolute", left: 26, bottom: 24, right: 26 }}>
                  <span className="zl-tag" style={{ marginBottom: 12, display: "inline-block" }}>Pick de la semana</span>
                  <div style={{ fontSize: "1.7rem", fontWeight: 700, letterSpacing: "-0.02em", color: "#fff" }}>{STAFF_HERO.name}</div>
                  <div style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.75)", marginTop: 4 }}>{STAFF_HERO.artist} · {STAFF_HERO.bpm} BPM · {STAFF_HERO.duration}</div>
                </div>
              </div>
            </button>

            {/* Curator note + list */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div className="zl-card" style={{ padding: 22, marginBottom: 16 }}>
                <p style={{ fontSize: "1.02rem", lineHeight: 1.6, color: "var(--text)", fontWeight: 500 }}>
                  “Texturas cálidas y un crescendo que respira. Funciona igual de bien en un reel de bodas que en el cierre de un documental.”
                </p>
                <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, var(--purple), var(--purple-2))" }} />
                  <span style={{ fontSize: "0.82rem", color: "var(--text-2)" }}>Curado por <strong style={{ color: "var(--text)" }}>el equipo Sonoris</strong></span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {STAFF_LIST.map((t, i) => {
                  const playing = activeTrack === t.id;
                  return (
                    <button key={t.id} className={`zl-track${playing ? " is-playing" : ""}`} onClick={() => handleTrack(t.id)} style={{ gridTemplateColumns: "26px 46px 1fr auto" }} aria-label={`Reproducir ${t.name}`}>
                      <span className="zl-track__rank">{playing ? <Play size={12} /> : i + 1}</span>
                      <span style={{ width: 46, height: 46 }}><Cover variant={t.cover} glyph={t.glyph} radius={9} /></span>
                      <span style={{ minWidth: 0 }}>
                        <span className="zl-track__title" style={{ display: "block" }}>{t.name}</span>
                        <span className="zl-track__meta" style={{ display: "block" }}>{t.artist} · {t.mood}</span>
                      </span>
                      <span className="zl-track__dur">{t.duration}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── NEW MUSIC ── */}
      <section className="zl-section zl-section--tight">
        <div className="zl-wrap">
          <SectionHeader eyebrow="Novedades" title="Recién añadido" desc="Pistas frescas que acaban de entrar al catálogo." action="Ver novedades" />
          <div data-reveal style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }} className="zl-new-grid">
            {NEW_MUSIC.map((t) => (
              <button key={t.id} className="zl-release" onClick={() => handleTrack(t.id)} aria-label={`Reproducir ${t.name}`}>
                <div style={{ position: "relative" }}>
                  <Cover variant={t.cover} glyph={t.glyph} />
                  <span className="zl-pill-new" style={{ position: "absolute", top: 12, left: 12 }}>Nuevo</span>
                  <span className="zl-release__play"><Play size={18} /></span>
                </div>
                <div className="zl-release__title">{t.name}</div>
                <div className="zl-release__meta">{t.artist} · {t.duration}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── GENRE COLLECTIONS ── */}
      <section id="genres" className="zl-section">
        <div className="zl-wrap">
          <SectionHeader eyebrow="Colecciones por género" title="Explora por estilo" desc="Del cine al culto, del lo-fi al corporativo. Encuentra el tono exacto de tu proyecto." />
          <div data-reveal style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22 }} className="zl-coll-grid">
            {GENRES.map((g) => (
              <button key={g.name} className="zl-collection" aria-label={`Colección ${g.name}`}>
                <div className="zl-collection__bg" style={{ background: COVERS[g.cover] }} />
                <div className="zl-collection__shade" />
                <div className="zl-collection__body">
                  <span style={{ fontSize: "1.4rem" }}>{g.glyph}</span>
                  <div style={{ marginTop: "auto" }}>
                    <div className="zl-collection__name">{g.name}</div>
                    <div className="zl-collection__count">{g.count} tracks</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── MOOD COLLECTIONS ── */}
      <section id="moods" className="zl-section zl-section--tight">
        <div className="zl-wrap">
          <SectionHeader eyebrow="Colecciones por mood" title="Encuentra el sentimiento" desc="A veces no buscas un género — buscas una emoción." />
          <div data-reveal style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 18 }} className="zl-mood-grid">
            {MOODS.map((m) => (
              <button key={m.name} className="zl-collection" style={{ aspectRatio: "3 / 4" }} aria-label={`Mood ${m.name}`}>
                <div className="zl-collection__bg" style={{ background: COVERS[m.cover] }} />
                <div className="zl-collection__shade" />
                <div className="zl-collection__body" style={{ padding: 16 }}>
                  <div style={{ marginTop: "auto" }}>
                    <div className="zl-collection__name" style={{ fontSize: "1.05rem" }}>{m.name}</div>
                    <div className="zl-collection__count">{m.count}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATALOG (filterable) ── */}
      <section id="catalog" className="zl-section">
        <div className="zl-wrap">
          <SectionHeader eyebrow="Catálogo completo" title="Escucha antes de decidir" desc="Cada pista fue escuchada y aprobada por productores. Si no la pondríamos en un proyecto de cliente, no entra." />
          <div data-reveal style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
            {FILTERS.map((f) => (
              <button key={f.value} className={`zl-chip${activeFilter === f.value ? " is-active" : ""}`} onClick={() => setActiveFilter(f.value)}>{f.label}</button>
            ))}
          </div>
          <div data-reveal style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 24 }}>
            {filtered.map((t) => (
              <button key={t.id} className="zl-release" onClick={() => handleTrack(t.id)} aria-label={`Reproducir ${t.name}`}>
                <Cover variant={t.cover} glyph={t.glyph} />
                <span className="zl-release__play"><Play size={18} /></span>
                <div className="zl-release__title">{t.name}</div>
                <div className="zl-release__meta">{t.artist} · {t.bpm} BPM · {t.duration}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                  <span className="zl-tag">{t.mood}</span>
                  <span className="zl-tag">{t.genre}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── LICENSE / CERTIFICATE ── */}
      <section id="license" className="zl-section">
        <div className="zl-wrap" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center" }}>
          <div className="zl-card" data-reveal style={{ padding: 30 }}>
            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 18, marginBottom: 18, borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontWeight: 700 }}>Sonoris</span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>Certificado de Licencia</span>
            </div>
            {[
              ["N° de Certificado", "SNR-2026-00847"],
              ["Track", "Midnight Drive"],
              ["ID de Track", "TRK-00291"],
              ["Plan", "Creator"],
              ["Fecha", "23 jun 2026"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--border)", fontSize: "0.84rem" }}>
                <span style={{ color: "var(--text-3)" }}>{k}</span>
                <span style={{ fontWeight: 500 }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: 18, padding: 16, background: "var(--lime-dim)", border: "1px solid rgba(205,255,79,0.25)", borderRadius: "var(--r-sm)" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--lime)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Alcance de Licencia</div>
              {["YouTube y plataformas de video", "Instagram, TikTok, Facebook, X", "Podcast y audio", "Transmisiones en vivo"].map((it) => (
                <div key={it} style={{ display: "flex", gap: 8, fontSize: "0.82rem", color: "var(--text-2)", padding: "3px 0" }}>
                  <span style={{ color: "var(--lime)" }}>✓</span> {it}
                </div>
              ))}
            </div>
          </div>

          <div data-reveal>
            <span className="zl-eyebrow">Descarga con tranquilidad</span>
            <h2 className="zl-h2" style={{ margin: "12px 0 18px" }}>Descarga hoy.<br />Publica mañana.<br />Sin preocupaciones.</h2>
            <p className="zl-muted" style={{ lineHeight: 1.7, marginBottom: 28 }}>
              Cada descarga incluye un certificado de licencia generado automáticamente.
              Guárdalo en el expediente del proyecto: si alguna vez necesitas demostrar que la música está en orden, ya lo tienes.
            </p>
            {[
              ["Sale solo, sin pedirlo", "Cada descarga genera su certificado en PDF, con todo lo que necesitas para el expediente."],
              ["Sabemos qué hay en cada pista", "Qué herramienta la generó, cuándo y con qué acuerdos vigentes. Todo documentado."],
              ["Lo que publicas queda tuyo", "El contenido que subes con plan activo sigue licenciado aunque canceles. Sin fecha de vencimiento."],
            ].map(([title, desc]) => (
              <div key={title} style={{ display: "flex", gap: 14, marginBottom: 16 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--purple-2)", marginTop: 7, flexShrink: 0 }} />
                <div>
                  <h4 style={{ fontSize: "0.92rem", fontWeight: 700, marginBottom: 3 }}>{title}</h4>
                  <p style={{ fontSize: "0.84rem", color: "var(--text-2)", lineHeight: 1.55 }}>{desc}</p>
                </div>
              </div>
            ))}
            <button className="zl-btn zl-btn--primary" style={{ marginTop: 10 }} onClick={() => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" })}>
              Explorar el catálogo <Arrow />
            </button>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="zl-section">
        <div className="zl-wrap">
          <div data-reveal style={{ textAlign: "center", marginBottom: 44, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
            <span className="zl-eyebrow">Precios</span>
            <h2 className="zl-h2" style={{ margin: "12px 0 14px" }}>Elige tu plan</h2>
            <p className="zl-muted">Empieza gratis. Escucha todo el catálogo antes de decidir.</p>
          </div>
          <div data-reveal style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18 }} className="zl-pricing-grid">
            {[
              { tier: "Free", color: "var(--text-3)", price: "$0", period: "/mes", note: " ", desc: "Escucha el catálogo completo sin compromiso. Sin tarjeta.", cta: "Explorar gratis", style: "ghost", featured: false,
                features: [[true, "Preview de 30s de todo"], [false, "Descarga de tracks"], [false, "Certificado de licencia"], [false, "Uso comercial"]] },
              { tier: "Creator", color: "var(--purple-2)", price: "$9", period: "/mes", note: "$7/mes anual · ahorra $24", desc: "Para creadores que publican de forma regular y necesitan música nueva constante.", cta: "Empezar con Creator", style: "primary", featured: true,
                features: [[true, "Catálogo completo en MP3"], [true, "Descargas ilimitadas"], [true, "Certificado de licencia PDF"], [true, "YouTube, Podcast, RRSS"], [false, "WAV lossless"], [false, "Anuncios pagados"]] },
              { tier: "Pro", color: "var(--orange)", price: "$19", period: "/mes", note: "$15/mes anual · ahorra $48", desc: "Para videógrafos y agencias que entregan a clientes y necesitan lossless.", cta: "Empezar con Pro", style: "ghost", featured: false,
                features: [[true, "Todo lo de Creator"], [true, "WAV lossless"], [true, "Licencia comercial completa"], [true, "Anuncios digitales pagados"], [true, "Videos corporativos y apps"], [true, "Prioridad en nuevos tracks"]] },
              { tier: "Iglesias / ONGs", color: "var(--lime)", price: "$5", period: "/mes", note: "Exclusivo uso no comercial", desc: "Para iglesias y ministerios que producen contenido de culto.", cta: "Plan para iglesias", style: "lime", featured: false,
                features: [[true, "Catálogo completo en MP3"], [true, "Descargas ilimitadas"], [true, "Certificado de licencia"], [true, "Cultos, eventos, streaming"], [false, "Uso comercial"], [false, "WAV o broadcast"]] },
            ].map((p) => (
              <div key={p.tier} className={`zl-plan${p.featured ? " is-featured" : ""}`}>
                {p.featured && <span style={{ position: "absolute", top: 14, right: 14 }} className="zl-pill-new">Popular</span>}
                <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: p.color, marginBottom: 14 }}>{p.tier}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontSize: "2.5rem", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}>{p.price}</span>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-3)" }}>{p.period}</span>
                </div>
                <div style={{ fontSize: "0.74rem", color: "var(--lime)", margin: "8px 0 18px", minHeight: 18 }}>{p.note}</div>
                <p style={{ fontSize: "0.84rem", color: "var(--text-2)", lineHeight: 1.55, marginBottom: 22, flex: 1 }}>{p.desc}</p>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 9, marginBottom: 22 }}>
                  {p.features.map(([ok, text], i) => (
                    <li key={i} style={{ display: "flex", gap: 9, fontSize: "0.82rem", color: ok ? "var(--text-2)" : "var(--text-3)" }}>
                      <span style={{ color: ok ? "var(--lime)" : "var(--text-3)", flexShrink: 0 }}>{ok ? "✓" : "✕"}</span>{text as string}
                    </li>
                  ))}
                </ul>
                <button
                  className={`zl-btn zl-btn--block ${p.style === "primary" ? "zl-btn--primary" : p.style === "lime" ? "zl-btn--lime" : "zl-btn--ghost"}`}
                  onClick={() => setModalOpen(true)}
                >{p.cta}</button>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", marginTop: 26, fontSize: "0.82rem", color: "var(--text-3)" }}>
            Todo lo que publicas con tu plan activo queda licenciado para siempre · Cancela cuando quieras
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: "44px 0", position: "relative", zIndex: 1 }}>
        <div className="zl-wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <a href="/" className="zl-brand">
            <span className="zl-brand__mark">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="#fff"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3z" /></svg>
            </span>
            <span className="zl-brand__name">Sonoris</span>
          </a>
          <ul style={{ display: "flex", gap: 24, listStyle: "none", flexWrap: "wrap" }}>
            {["Términos de licencia", "Privacidad", "Términos de uso", "Contacto"].map((l) => (
              <li key={l}><a href="#" className="zl-foot-link">{l}</a></li>
            ))}
          </ul>
          <p style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>© 2026 Sonoris · JM Creativos LLC · Puerto Rico</p>
        </div>
      </footer>

      {/* ── MODAL ── */}
      {modalOpen && (
        <div className="zl-overlay" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }} role="dialog" aria-modal="true" aria-label="Registro">
          <div className="zl-modal">
            <button className="zl-modal__close" onClick={() => setModalOpen(false)} aria-label="Cerrar">✕</button>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 8, letterSpacing: "-0.02em" }}>Escucha el catálogo completo</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-2)", marginBottom: 24 }}>Crea tu cuenta gratis y accede a todo. Sin tarjeta, sin compromiso.</p>
            {formSubmitted ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--lime)", fontWeight: 700 }}>✓ ¡Listo! Revisa tu email</div>
            ) : (
              <>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Nombre</label>
                <input className="zl-input" type="text" placeholder="Tu nombre" style={{ marginBottom: 16 }} />
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Email</label>
                <input className="zl-input" type="email" placeholder="tuemail@ejemplo.com" style={{ marginBottom: 22 }} />
                <button className="zl-btn zl-btn--primary zl-btn--block" onClick={handleSubmit}>Crear cuenta gratis <Arrow /></button>
                <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--text-3)", marginTop: 12 }}>Te enviaremos un link mágico. Sin contraseñas.</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Responsive */}
      <style>{`
        @media (max-width: 980px) {
          header.zl-section > .zl-wrap { grid-template-columns: 1fr !important; gap: 48px !important; }
          #license > .zl-wrap { grid-template-columns: 1fr !important; }
          .zl-staff-grid { grid-template-columns: 1fr !important; }
          .zl-coll-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .zl-new-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .zl-mood-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .zl-pricing-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 600px) {
          .zl-coll-grid, .zl-new-grid, .zl-pricing-grid { grid-template-columns: 1fr !important; }
          .zl-mood-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </>
  );
}
