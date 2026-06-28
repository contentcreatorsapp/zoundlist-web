"use client";

import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import type { Catalog, Track } from "@/types/catalog";
import { COVERS } from "@/lib/catalog/covers";
import { Cover } from "@/components/ui/Cover";
import { Brand } from "@/components/brand";
import { usePlayer } from "@/lib/player/context";
import { loadPlayer } from "@/lib/player/storage";
import type { PlayerTrack } from "@/lib/player/types";
import { EDITORIAL_PLAYLISTS, ORIGINALS_CONFIG } from "@/lib/radio/playlists";
import type { EditorialPlaylist } from "@/lib/radio/types";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

// ── Icons ─────────────────────────────────────────────────────────────────────
function Play({ size = 18 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor"><path d="M8 5v14l11-7z" /></svg>;
}
function Pause({ size = 18 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>;
}
function Arrow() {
  return <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function toPlayerTrack(t: Track): PlayerTrack | null {
  if (!t.audioUrl) return null;
  return {
    id: t.id,
    title: t.title,
    artist: t.artist,
    audioUrl: t.audioUrl,
    cover: t.cover,
    coverImage: t.coverImage ?? null,
    duration: t.duration,
    albumId: null,
  };
}

function tracksForPlaylist(tracks: Track[], pl: EditorialPlaylist): Track[] {
  return tracks.filter(t => {
    const genreMatch = pl.genreSlugs.includes(t.genre);
    const moodMatch  = pl.moodKeywords.some(k =>
      t.mood.toLowerCase().includes(k.toLowerCase())
    );
    return genreMatch || moodMatch;
  });
}

function fmt(sec: number): string {
  if (!sec || !isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ── Editorial signal badge ─────────────────────────────────────────────────────
function Signal({ track }: { track: Track }) {
  if (track.trending)  return <span className="zl-signal zl-signal--trending">Trending</span>;
  if (track.isNew)     return <span className="zl-signal zl-signal--new">Nuevo</span>;
  if (track.staffPick) return <span className="zl-signal zl-signal--pick">Staff Pick</span>;
  if (track.featured)  return <span className="zl-signal zl-signal--featured">Destacado</span>;
  return null;
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHead({
  eyebrow,
  title,
  desc,
  href,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
  href?: string;
}) {
  return (
    <div className="zl-shead" data-reveal>
      <div>
        <span className="zl-eyebrow">{eyebrow}</span>
        <h2 className="zl-h2" style={{ marginTop: 10 }}>{title}</h2>
        {desc && <p style={{ marginTop: 8, color: "var(--text-2)", fontSize: "0.95rem" }}>{desc}</p>}
      </div>
      {href && (
        <a href={href} className="zl-shead__link">Ver todo <Arrow /></a>
      )}
    </div>
  );
}

// ── Playlist card ──────────────────────────────────────────────────────────────
function PlaylistCard({
  playlist,
  trackCount,
  playing,
  onPlay,
}: {
  playlist: EditorialPlaylist;
  trackCount: number;
  playing: boolean;
  onPlay: () => void;
}) {
  return (
    <button className="zl-radio-playlist" onClick={onPlay} aria-label={`Reproducir ${playlist.title}`}>
      {playlist.coverImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="zl-radio-playlist__bg" src={playlist.coverImage} alt="" />
      ) : (
        <div className="zl-radio-playlist__bg" style={{ background: COVERS[playlist.coverVariant] }} />
      )}
      <div className="zl-radio-playlist__shade" />
      <div className="zl-radio-playlist__play" aria-hidden="true">
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </div>
      <div className="zl-radio-playlist__body">
        <div className="zl-radio-playlist__title">{playlist.title}</div>
        <div className="zl-radio-playlist__desc">{playlist.description}</div>
        {trackCount > 0 && (
          <div className="zl-radio-playlist__count">{trackCount} {trackCount === 1 ? "track" : "tracks"}</div>
        )}
      </div>
    </button>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function RadioClient({ catalog }: { catalog: Catalog }) {
  const { tracks, genres } = catalog;

  // Derived catalog sections
  const heroTrack   = tracks.find(t => t.staffHero) ?? tracks.find(t => t.featured) ?? tracks[0];
  const featured    = tracks.filter(t => t.featured);
  const trending    = tracks.filter(t => t.trending);
  const newTracks   = tracks.filter(t => t.isNew);
  const staffPicks  = tracks.filter(t => t.staffPick && !t.staffHero);
  const staffHero   = tracks.find(t => t.staffHero) ?? tracks.find(t => t.staffPick) ?? null;
  const heroQueue   = featured.length ? featured : tracks.slice(0, 4);

  // All playable tracks (have audioUrl)
  const audioTracks = tracks.map(toPlayerTrack).filter((t): t is PlayerTrack => t !== null);

  // UI state
  const [scrolled, setScrolled]           = useState(false);
  const [user, setUser]                   = useState<User | null>(null);
  const [recentTracks, setRecentTracks]   = useState<Track[]>([]);
  const [activeGenre, setActiveGenre]     = useState("all");

  const player    = usePlayer();
  const playingId = player.track?.id ?? null;

  // Auth session
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setUser(session?.user ?? null)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  // Scroll nav state
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll reveal
  useEffect(() => {
    const els = document.querySelectorAll("[data-reveal]");
    const io  = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
      }),
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Continue Listening — map persisted queue back to full Track objects
  useEffect(() => {
    const saved = loadPlayer();
    if (saved.queue?.length) {
      const ids = new Set(saved.queue.map(pt => pt.id));
      const recent = tracks.filter(t => ids.has(t.id)).slice(0, 5);
      setRecentTracks(recent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Player helpers ───────────────────────────────────────────────────────────
  const toggle = (t: Track, queue?: Track[]) => {
    const pt = toPlayerTrack(t);
    if (!pt) return;
    if (playingId === t.id) { player.togglePlay(); return; }
    const q = (queue ?? [t]).map(toPlayerTrack).filter((x): x is PlayerTrack => x !== null);
    player.playTrack(pt, q.length ? q : audioTracks);
  };

  const playPlaylist = (pl: EditorialPlaylist) => {
    const plTracks = tracksForPlaylist(tracks, pl);
    const withAudio = plTracks.map(toPlayerTrack).filter((t): t is PlayerTrack => t !== null);
    if (!withAudio.length) return;
    player.playTrack(withAudio[0], withAudio);
  };

  const isPlaylistPlaying = (pl: EditorialPlaylist) => {
    if (!playingId || !player.isPlaying) return false;
    const plTracks = tracksForPlaylist(tracks, pl);
    return plTracks.some(t => t.id === playingId);
  };

  const playHero = () => {
    if (!heroTrack) return;
    toggle(heroTrack, heroQueue);
  };

  // Filtered catalog (bottom section)
  const filteredTracks = activeGenre === "all"
    ? tracks
    : tracks.filter(t => t.genre === activeGenre);

  const genreName = (slug: string) => genres.find(g => g.slug === slug)?.name ?? slug;

  if (!heroTrack) return null;

  const heroOn      = playingId === heroTrack.id;
  const heroBg      = heroTrack.coverImage
    ? { backgroundImage: `url(${heroTrack.coverImage})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: COVERS[heroTrack.cover] };

  return (
    <>
      {/* ── NAV ── */}
      <nav className={`zl-nav${scrolled ? " is-scrolled" : ""}`}>
        <div className="zl-wrap zl-nav__inner">
          <Brand height={24} />
          <ul className="zl-nav__links zl-hide-md">
            <li><a href="/" className="zl-nav__link">Inicio</a></li>
            <li>
              <span className="zl-nav__link" style={{ color: "var(--text)", cursor: "default" }}>
                Radio
              </span>
            </li>
            <li><a href="/#catalog" className="zl-nav__link">Catálogo</a></li>
            <li><a href="/#pricing" className="zl-nav__link">Precios</a></li>
          </ul>
          <div className="zl-nav__actions">
            {user ? (
              <a href="/dashboard" className="zl-btn zl-btn--primary zl-btn--sm">Mi panel</a>
            ) : (
              <>
                <a href="/" className="zl-nav__login zl-hide-md">Iniciar sesión</a>
                <a href="/" className="zl-btn zl-btn--primary zl-btn--sm">Empezar gratis</a>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="zl-radio-hero">
        {/* Blurred cinematic background */}
        <div className="zl-radio-hero__bg" aria-hidden="true" style={heroBg} />
        <div className="zl-radio-hero__overlay" aria-hidden="true" />

        <div className="zl-radio-hero__content">
          <div className="zl-wrap">
            <div className="zl-radio-live">
              <span className="zl-radio-live__dot" />
              Zoundlist Radio
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "300px 1fr",
                gap: 56,
                alignItems: "center",
              }}
              className="zl-radio-hero-grid"
            >
              {/* Cover art */}
              <div style={{ position: "relative" }}>
                <div style={{ width: 300, height: 300, borderRadius: 24, overflow: "hidden", boxShadow: "0 40px 100px rgba(0,0,0,0.7)" }}>
                  <Cover variant={heroTrack.cover} glyph={heroTrack.glyph} radius={24} image={heroTrack.coverImage} />
                </div>
                {(heroTrack.trending || heroTrack.isNew || heroTrack.staffPick) && (
                  <div style={{ position: "absolute", top: -10, right: -10 }}>
                    <Signal track={heroTrack} />
                  </div>
                )}
              </div>

              {/* Track info */}
              <div>
                <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                  <span className="zl-tag">{genreName(heroTrack.genre)}</span>
                  <span className="zl-tag">{heroTrack.mood}</span>
                  {heroTrack.bpm > 0 && <span className="zl-tag">{heroTrack.bpm} BPM</span>}
                  <span className="zl-tag">{heroTrack.duration}</span>
                </div>

                <h1
                  style={{
                    fontSize: "clamp(2.2rem, 5vw, 4rem)",
                    fontWeight: 700,
                    lineHeight: 0.98,
                    letterSpacing: "-0.04em",
                    marginBottom: 12,
                    color: "var(--text)",
                  }}
                >
                  {heroTrack.title}
                </h1>
                <p style={{ fontSize: "1.15rem", color: "var(--text-2)", marginBottom: 8 }}>
                  {heroTrack.artist}
                </p>
                {heroTrack.description && (
                  <p
                    style={{
                      fontSize: "0.9rem",
                      color: "var(--text-3)",
                      lineHeight: 1.65,
                      maxWidth: 440,
                      marginBottom: 28,
                    }}
                  >
                    {heroTrack.description}
                  </p>
                )}

                <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: heroTrack.description ? 0 : 32, flexWrap: "wrap" }}>
                  {heroTrack.audioUrl ? (
                    <button
                      className="zl-iconbtn zl-play-main"
                      style={{ width: 64, height: 64 }}
                      onClick={playHero}
                      aria-label={heroOn && player.isPlaying ? "Pausar" : "Reproducir"}
                    >
                      {heroOn && player.isPlaying ? <Pause size={24} /> : <Play size={24} />}
                    </button>
                  ) : (
                    <div style={{ fontSize: "0.82rem", color: "var(--text-3)", padding: "10px 0" }}>
                      Audio no disponible aún
                    </div>
                  )}

                  {heroOn && player.isPlaying && (
                    <span style={{ fontSize: "0.82rem", color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}>
                      {fmt(player.currentTime)} / {player.duration ? fmt(player.duration) : heroTrack.duration}
                    </span>
                  )}

                  <a href="/" className="zl-btn zl-btn--ghost zl-btn--sm" style={{ marginLeft: "auto" }}>
                    Descargar <Arrow />
                  </a>
                </div>

                {/* Queue */}
                {heroQueue.length > 1 && (
                  <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 6, maxWidth: 480 }}>
                    <p style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                      A continuación
                    </p>
                    {heroQueue.filter(t => t.id !== heroTrack.id).slice(0, 3).map(t => {
                      const on = playingId === t.id;
                      return (
                        <button
                          key={t.id}
                          className={`zl-queue-item${on ? " is-active" : ""}`}
                          onClick={() => toggle(t, heroQueue)}
                          aria-label={`Reproducir ${t.title}`}
                        >
                          <span style={{ fontSize: "0.75rem", color: on ? "var(--brand)" : "var(--text-3)", width: 14, textAlign: "center" }}>
                            {on && player.isPlaying ? "♪" : ""}
                          </span>
                          <div style={{ width: 36, height: 36 }}>
                            <Cover variant={t.cover} radius={8} image={t.coverImage} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "0.85rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
                            <div style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>{t.artist}</div>
                          </div>
                          <span style={{ fontSize: "0.72rem", color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}>{t.duration}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTINUE LISTENING ── */}
      {recentTracks.length > 0 && (
        <section className="zl-section zl-section--tight">
          <div className="zl-wrap">
            <SectionHead eyebrow="Tu historial" title="Retoma donde lo dejaste" />
            <div className="zl-rail" data-reveal>
              {recentTracks.map(t => {
                const on = playingId === t.id;
                return (
                  <button key={t.id} className="zl-release" onClick={() => toggle(t, recentTracks)} aria-label={`Reproducir ${t.title}`}>
                    <div style={{ position: "relative" }}>
                      <Cover variant={t.cover} glyph={t.glyph} image={t.coverImage} />
                      {on && player.isPlaying && (
                        <span className="zl-release__play" style={{ opacity: 1, transform: "translateY(0) scale(1)" }}>
                          <Pause size={18} />
                        </span>
                      )}
                      {!on && (
                        <span className="zl-release__play">
                          <Play size={18} />
                        </span>
                      )}
                    </div>
                    <div className="zl-release__title">{t.title}</div>
                    <div className="zl-release__meta">{t.artist} · {t.duration}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── TRENDING NOW ── */}
      {trending.length > 0 && (
        <section className="zl-section zl-section--tight">
          <div className="zl-wrap">
            <SectionHead
              eyebrow="En tendencia"
              title="Trending ahora"
              desc="Los tracks que el equipo marcó como referencia esta semana."
            />
            <div className="zl-tracks" data-reveal>
              {trending.map((t, i) => {
                const on = playingId === t.id;
                return (
                  <button
                    key={t.id}
                    className={`zl-track${on ? " is-playing" : ""}`}
                    onClick={() => toggle(t, trending)}
                    aria-label={`Reproducir ${t.title}`}
                    style={!t.audioUrl ? { opacity: 0.45, cursor: "default" } : undefined}
                  >
                    <span className="zl-track__rank">
                      {on ? (player.isPlaying ? <Pause size={13} /> : <Play size={13} />) : i + 1}
                    </span>
                    <span className="zl-track__cover">
                      <Cover variant={t.cover} glyph={t.glyph} radius={10} image={t.coverImage} />
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span className="zl-track__title" style={{ display: "block" }}>{t.title}</span>
                      <span className="zl-track__meta" style={{ display: "block" }}>
                        {t.artist} · {t.mood} · {t.bpm > 0 ? `${t.bpm} BPM` : t.duration}
                      </span>
                    </span>
                    <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <Signal track={t} />
                      <span className="zl-track__dur">{t.duration}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── EDITORIAL PLAYLISTS ── */}
      <section className="zl-section">
        <div className="zl-wrap">
          <SectionHead
            eyebrow="Playlists editoriales"
            title="Curadas para cada momento"
            desc="No algoritmos. Cada playlist fue construida con criterio editorial."
          />
          <div
            data-reveal
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}
            className="zl-radio-playlist-grid"
          >
            {EDITORIAL_PLAYLISTS.map(pl => {
              const plTracks = tracksForPlaylist(tracks, pl);
              return (
                <PlaylistCard
                  key={pl.id}
                  playlist={pl}
                  trackCount={plTracks.length}
                  playing={isPlaylistPlaying(pl)}
                  onPlay={() => playPlaylist(pl)}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* ── RECENTLY ADDED ── */}
      {newTracks.length > 0 && (
        <section className="zl-section zl-section--tight">
          <div className="zl-wrap">
            <SectionHead
              eyebrow="Novedades"
              title="Recién añadido"
              desc="Pistas frescas que acaban de entrar al catálogo."
            />
            <div
              data-reveal
              style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}
              className="zl-radio-new-grid"
            >
              {newTracks.map(t => {
                const on = playingId === t.id;
                return (
                  <button key={t.id} className="zl-release" onClick={() => toggle(t, newTracks)} aria-label={`Reproducir ${t.title}`}>
                    <div style={{ position: "relative" }}>
                      <Cover variant={t.cover} glyph={t.glyph} image={t.coverImage} />
                      <span className="zl-pill-new" style={{ position: "absolute", top: 12, left: 12 }}>Nuevo</span>
                      <span className="zl-release__play" style={on ? { opacity: 1, transform: "translateY(0) scale(1)" } : undefined}>
                        {on && player.isPlaying ? <Pause size={18} /> : <Play size={18} />}
                      </span>
                    </div>
                    <div className="zl-release__title">{t.title}</div>
                    <div className="zl-release__meta">{t.artist} · {t.duration}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── STAFF PICKS ── */}
      {staffHero && (
        <section className="zl-section">
          <div className="zl-wrap">
            <SectionHead
              eyebrow="Selección editorial"
              title="Staff Picks"
              desc="Una pieza destacada y las que la acompañan, elegidas con criterio."
            />
            <div
              data-reveal
              style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 40, alignItems: "stretch" }}
              className="zl-radio-staff-grid"
            >
              {/* Hero pick */}
              <button
                className="zl-release"
                onClick={() => toggle(staffHero, [staffHero, ...staffPicks])}
                style={{ position: "relative" }}
                aria-label={`Reproducir ${staffHero.title}`}
              >
                <div style={{ position: "relative", borderRadius: "var(--r-lg)", overflow: "hidden", aspectRatio: "16/11" }}>
                  {staffHero.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={staffHero.coverImage} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ position: "absolute", inset: 0, background: COVERS[staffHero.cover] }} />
                  )}
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 35%, rgba(0,0,0,0.78))" }} />
                  <span
                    className="zl-release__play"
                    style={{
                      width: 56, height: 56,
                      ...(playingId === staffHero.id ? { opacity: 1, transform: "translateY(0) scale(1)" } : {})
                    }}
                  >
                    {playingId === staffHero.id && player.isPlaying ? <Pause size={22} /> : <Play size={22} />}
                  </span>
                  <div style={{ position: "absolute", left: 24, bottom: 22, right: 24 }}>
                    <span className="zl-tag" style={{ marginBottom: 10, display: "inline-block" }}>Pick de la semana</span>
                    <div style={{ fontSize: "1.6rem", fontWeight: 700, letterSpacing: "-0.02em", color: "#fff" }}>{staffHero.title}</div>
                    <div style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
                      {staffHero.artist} · {staffHero.bpm > 0 ? `${staffHero.bpm} BPM · ` : ""}{staffHero.duration}
                    </div>
                  </div>
                </div>
              </button>

              {/* Staff list */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                {staffHero.staffNote && (
                  <div className="zl-card" style={{ padding: 20, marginBottom: 14 }}>
                    <p style={{ fontSize: "0.98rem", lineHeight: 1.6, color: "var(--text)", fontWeight: 500 }}>
                      &ldquo;{staffHero.staffNote}&rdquo;
                    </p>
                    <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--brand-dim)", border: "1px solid var(--brand-3)", flexShrink: 0 }} />
                      <span style={{ fontSize: "0.8rem", color: "var(--text-2)" }}>
                        Curado por <strong style={{ color: "var(--text)" }}>el equipo Zoundlist</strong>
                      </span>
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {staffPicks.slice(0, 5).map((t, i) => {
                    const on = playingId === t.id;
                    return (
                      <button
                        key={t.id}
                        className={`zl-track${on ? " is-playing" : ""}`}
                        onClick={() => toggle(t, [staffHero, ...staffPicks])}
                        style={{ gridTemplateColumns: "26px 46px 1fr auto", ...(!t.audioUrl ? { opacity: 0.4, cursor: "default" } : {}) }}
                        aria-label={`Reproducir ${t.title}`}
                      >
                        <span className="zl-track__rank">
                          {on ? (player.isPlaying ? <Pause size={12} /> : <Play size={12} />) : i + 1}
                        </span>
                        <span style={{ width: 46, height: 46 }}>
                          <Cover variant={t.cover} glyph={t.glyph} radius={9} image={t.coverImage} />
                        </span>
                        <span style={{ minWidth: 0 }}>
                          <span className="zl-track__title" style={{ display: "block" }}>{t.title}</span>
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
      )}

      {/* ── BROWSE BY GENRE ── */}
      {genres.length > 0 && (
        <section className="zl-section zl-section--tight">
          <div className="zl-wrap">
            <SectionHead
              eyebrow="Explorar"
              title="Por género"
              desc="Del cine al culto, del lo-fi al corporativo."
            />
            <div
              data-reveal
              style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}
              className="zl-radio-genre-grid"
            >
              {genres.map(g => {
                const gTracks = tracks.filter(t => t.genre === g.slug);
                const first   = gTracks.find(t => !!t.audioUrl);
                return (
                  <button
                    key={g.slug}
                    className="zl-collection"
                    onClick={() => {
                      if (first) {
                        const q = gTracks.map(toPlayerTrack).filter((t): t is PlayerTrack => t !== null);
                        player.playTrack(toPlayerTrack(first)!, q);
                      }
                    }}
                    aria-label={`Reproducir colección ${g.name}`}
                  >
                    <div className="zl-collection__bg" style={{ background: COVERS[g.cover] }} />
                    <div className="zl-collection__shade" />
                    <div className="zl-collection__body">
                      <span style={{ fontSize: "1.6rem" }}>{g.glyph}</span>
                      <div style={{ marginTop: "auto" }}>
                        <div className="zl-collection__name">{g.name}</div>
                        <div className="zl-collection__count">{g.trackCount} tracks</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── ZOUNDLIST ORIGINALS (architecture ready, enabled: false) ── */}
      {ORIGINALS_CONFIG.enabled && (
        <section className="zl-section">
          <div className="zl-wrap">
            <div className="zl-originals" data-reveal>
              <div className="zl-originals__label">
                <span>✦</span>
                {ORIGINALS_CONFIG.labelName}
              </div>
              <h2 className="zl-h2" style={{ marginBottom: 14 }}>{ORIGINALS_CONFIG.tagline}</h2>
              <p style={{ color: "var(--text-2)", maxWidth: 520, fontSize: "0.95rem", lineHeight: 1.65 }}>
                {ORIGINALS_CONFIG.comingSoonText}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── DISCOVER — full catalog + genre filter ── */}
      <section className="zl-section" id="discover">
        <div className="zl-wrap">
          <SectionHead
            eyebrow="Descubrir"
            title="Todo el catálogo"
            desc="Escucha antes de decidir. Cada pista aprobada por productores."
          />
          <div data-reveal style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
            <button
              className={`zl-chip${activeGenre === "all" ? " is-active" : ""}`}
              onClick={() => setActiveGenre("all")}
            >
              Todo
            </button>
            {genres.map(g => (
              <button
                key={g.slug}
                className={`zl-chip${activeGenre === g.slug ? " is-active" : ""}`}
                onClick={() => setActiveGenre(g.slug)}
              >
                {g.name}
              </button>
            ))}
          </div>
          <div
            data-reveal
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 22 }}
          >
            {filteredTracks.map(t => {
              const on = playingId === t.id;
              return (
                <button
                  key={t.id}
                  className="zl-release"
                  onClick={() => toggle(t, filteredTracks)}
                  aria-label={`Reproducir ${t.title}`}
                >
                  <div style={{ position: "relative" }}>
                    <Cover variant={t.cover} glyph={t.glyph} image={t.coverImage} />
                    {(t.isNew || t.trending || t.staffPick) && (
                      <div style={{ position: "absolute", top: 10, left: 10 }}>
                        <Signal track={t} />
                      </div>
                    )}
                    <span
                      className="zl-release__play"
                      style={on ? { opacity: 1, transform: "translateY(0) scale(1)" } : undefined}
                    >
                      {on && player.isPlaying ? <Pause size={18} /> : <Play size={18} />}
                    </span>
                  </div>
                  <div className="zl-release__title">{t.title}</div>
                  <div className="zl-release__meta">
                    {t.artist} · {t.bpm > 0 ? `${t.bpm} BPM · ` : ""}{t.duration}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    <span className="zl-tag">{t.mood}</span>
                    <span className="zl-tag">{genreName(t.genre)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: "44px 0", position: "relative", zIndex: 1 }}>
        <div className="zl-wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <Brand height={22} />
          <ul style={{ display: "flex", gap: 24, listStyle: "none", flexWrap: "wrap" }}>
            {[
              ["Catálogo", "/"],
              ["Licencias", "/licencia"],
              ["Privacidad", "/privacidad"],
              ["Términos", "/terminos"],
            ].map(([label, href]) => (
              <li key={label}><a href={href} className="zl-foot-link">{label}</a></li>
            ))}
          </ul>
          <p style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>© 2026 Zoundlist · JM Creativos LLC</p>
        </div>
      </footer>

      {/* ── RESPONSIVE ── */}
      <style>{`
        @media (max-width: 1024px) {
          .zl-radio-hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .zl-radio-hero-grid > :first-child { display: flex; justify-content: center; }
          .zl-radio-hero-grid > :first-child > div { width: 220px !important; height: 220px !important; }
        }
        @media (max-width: 980px) {
          .zl-radio-playlist-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .zl-radio-staff-grid   { grid-template-columns: 1fr !important; }
          .zl-radio-genre-grid   { grid-template-columns: repeat(2, 1fr) !important; }
          .zl-radio-new-grid     { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 600px) {
          .zl-radio-playlist-grid { grid-template-columns: 1fr !important; }
          .zl-radio-genre-grid    { grid-template-columns: 1fr !important; }
          .zl-radio-new-grid      { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </>
  );
}
