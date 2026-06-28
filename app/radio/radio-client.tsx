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

// ── Helpers ───────────────────────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 18) return "Buenas tardes";
  return "Buenas noches";
}

function toPlayerTrack(t: Track): PlayerTrack | null {
  if (!t.audioUrl) return null;
  return { id: t.id, title: t.title, artist: t.artist, audioUrl: t.audioUrl, cover: t.cover, coverImage: t.coverImage ?? null, duration: t.duration, albumId: null };
}

function tracksForStation(tracks: Track[], pl: EditorialPlaylist): Track[] {
  return tracks.filter(t => pl.genreSlugs.includes(t.genre) || pl.moodKeywords.some(k => t.mood.toLowerCase().includes(k.toLowerCase())));
}

function fmt(sec: number): string {
  if (!sec || !isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ── Editorial signal (no fake metrics) ───────────────────────────────────────
function Signal({ track }: { track: Track }) {
  if (track.trending)  return <span className="zl-signal zl-signal--trending">Trending</span>;
  if (track.isNew)     return <span className="zl-signal zl-signal--new">Nuevo</span>;
  if (track.staffPick) return <span className="zl-signal zl-signal--pick">Staff Pick</span>;
  return null;
}

// ── Station card (Spotify-style — press & listen, not download) ───────────────
function StationCard({ playlist, trackCount, playing, onPlay }: {
  playlist: EditorialPlaylist;
  trackCount: number;
  playing: boolean;
  onPlay: () => void;
}) {
  return (
    <button className="zl-radio-playlist" onClick={onPlay} aria-label={`Escuchar ${playlist.title}`}>
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

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHead({ eyebrow, title, desc }: { eyebrow: string; title: string; desc?: string }) {
  return (
    <div className="zl-shead" data-reveal>
      <div>
        <span className="zl-eyebrow">{eyebrow}</span>
        <h2 className="zl-h2" style={{ marginTop: 10 }}>{title}</h2>
        {desc && <p style={{ marginTop: 8, color: "var(--text-2)", fontSize: "0.95rem" }}>{desc}</p>}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function RadioClient({ catalog }: { catalog: Catalog }) {
  const { tracks, genres, moods } = catalog;

  const heroTrack  = tracks.find(t => t.staffHero) ?? tracks.find(t => t.featured) ?? tracks[0];
  const trending   = tracks.filter(t => t.trending);
  const newTracks  = tracks.filter(t => t.isNew);
  const staffPicks = tracks.filter(t => t.staffPick && !t.staffHero);
  const staffHero  = tracks.find(t => t.staffHero) ?? tracks.find(t => t.staffPick) ?? null;
  const heroQueue  = tracks.filter(t => t.featured || t.staffPick).slice(0, 4);

  const audioTracks = tracks.map(toPlayerTrack).filter((t): t is PlayerTrack => t !== null);

  const [scrolled, setScrolled]         = useState(false);
  const [user, setUser]                 = useState<User | null>(null);
  const [recentTracks, setRecentTracks] = useState<Track[]>([]);
  const [greeting, setGreeting]         = useState("");

  const player    = usePlayer();
  const playingId = player.track?.id ?? null;

  useEffect(() => { setGreeting(getGreeting()); }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll("[data-reveal]");
    const io  = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); } }),
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Continue Listening — match persisted queue back to catalog tracks
  useEffect(() => {
    const saved = loadPlayer();
    if (saved.queue?.length) {
      const ids = new Set(saved.queue.map(pt => pt.id));
      setRecentTracks(tracks.filter(t => ids.has(t.id)).slice(0, 5));
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

  const playStation = (pl: EditorialPlaylist) => {
    const stTracks = tracksForStation(tracks, pl).map(toPlayerTrack).filter((t): t is PlayerTrack => t !== null);
    if (!stTracks.length) return;
    player.playTrack(stTracks[0], stTracks);
  };

  const isStationPlaying = (pl: EditorialPlaylist) => {
    if (!playingId || !player.isPlaying) return false;
    return tracksForStation(tracks, pl).some(t => t.id === playingId);
  };

  const playMood = (moodName: string) => {
    const moodTracks = tracks
      .filter(t => t.mood.toLowerCase().includes(moodName.toLowerCase().split(" ")[0]))
      .map(toPlayerTrack)
      .filter((t): t is PlayerTrack => t !== null);
    if (!moodTracks.length) return;
    player.playTrack(moodTracks[0], moodTracks);
  };

  if (!heroTrack) return null;

  const heroOn = playingId === heroTrack.id;
  const heroBg = heroTrack.coverImage
    ? { backgroundImage: `url(${heroTrack.coverImage})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: COVERS[heroTrack.cover] };

  return (
    <>
      {/* ── NAV — Radio tiene su propia identidad, sin links de licencias/precios ── */}
      <nav className={`zl-nav${scrolled ? " is-scrolled" : ""}`}>
        <div className="zl-wrap zl-nav__inner">
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <Brand height={24} />
            <ul className="zl-nav__links zl-hide-md" style={{ margin: 0, padding: 0 }}>
              <li>
                <a href="/" className="zl-nav__link" style={{ fontSize: "0.85rem" }}>
                  ← Zoundlist
                </a>
              </li>
              <li>
                <span className="zl-nav__link" style={{ color: "var(--text)", cursor: "default" }}>
                  Radio
                </span>
              </li>
            </ul>
          </div>
          <div className="zl-nav__actions">
            {user ? (
              <a href="/dashboard" className="zl-btn zl-btn--primary zl-btn--sm">Mi panel</a>
            ) : (
              <a href="/" className="zl-btn zl-btn--ghost zl-btn--sm">Iniciar sesión</a>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO — Now playing, experiencia de escucha. Sin BPM, sin Descargar ── */}
      <section className="zl-radio-hero">
        <div className="zl-radio-hero__bg" aria-hidden="true" style={heroBg} />
        <div className="zl-radio-hero__overlay" aria-hidden="true" />

        <div className="zl-radio-hero__content">
          <div className="zl-wrap">
            {/* Saludo basado en hora del día */}
            {greeting && (
              <p style={{ fontSize: "0.95rem", color: "var(--text-2)", fontWeight: 500, marginBottom: 10 }}>
                {greeting}
              </p>
            )}
            <div className="zl-radio-live" style={{ marginBottom: 32 }}>
              <span className="zl-radio-live__dot" />
              En Radio ahora
            </div>

            <div
              style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 56, alignItems: "center" }}
              className="zl-radio-hero-grid"
            >
              {/* Cover */}
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

              {/* Track info — solo lo que importa para escuchar */}
              <div>
                <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
                  {/* Mood primero, no BPM ni genre_slug */}
                  <span className="zl-tag">{heroTrack.mood}</span>
                  {genres.find(g => g.slug === heroTrack.genre) && (
                    <span className="zl-tag">{genres.find(g => g.slug === heroTrack.genre)!.name}</span>
                  )}
                  <span className="zl-tag">{heroTrack.duration}</span>
                </div>

                <h1 style={{ fontSize: "clamp(2.4rem, 5vw, 4.2rem)", fontWeight: 700, lineHeight: 0.96, letterSpacing: "-0.04em", marginBottom: 10 }}>
                  {heroTrack.title}
                </h1>
                <p style={{ fontSize: "1.15rem", color: "var(--text-2)", marginBottom: 32 }}>
                  {heroTrack.artist}
                </p>

                {/* Solo play — Radio es para escuchar, no para descargar */}
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  {heroTrack.audioUrl ? (
                    <button
                      className="zl-iconbtn zl-play-main"
                      style={{ width: 68, height: 68 }}
                      onClick={() => toggle(heroTrack, heroQueue)}
                      aria-label={heroOn && player.isPlaying ? "Pausar" : "Reproducir"}
                    >
                      {heroOn && player.isPlaying ? <Pause size={26} /> : <Play size={26} />}
                    </button>
                  ) : (
                    <p style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>Próximamente</p>
                  )}
                  {heroOn && (
                    <span style={{ fontSize: "0.82rem", color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}>
                      {fmt(player.currentTime)} / {player.duration ? fmt(player.duration) : heroTrack.duration}
                    </span>
                  )}
                </div>

                {/* A continuación */}
                {heroQueue.length > 1 && (
                  <div style={{ marginTop: 36, maxWidth: 440 }}>
                    <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>
                      A continuación
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {heroQueue.filter(t => t.id !== heroTrack.id).slice(0, 3).map(t => {
                        const on = playingId === t.id;
                        return (
                          <button key={t.id} className={`zl-queue-item${on ? " is-active" : ""}`} onClick={() => toggle(t, heroQueue)} aria-label={`Reproducir ${t.title}`}>
                            <div style={{ width: 36, height: 36 }}>
                              <Cover variant={t.cover} radius={8} image={t.coverImage} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "0.85rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
                              <div style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>{t.artist} · {t.mood}</div>
                            </div>
                            <span style={{ fontSize: "0.72rem", color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}>{t.duration}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── RETOMA DONDE LO DEJASTE ── */}
      {recentTracks.length > 0 && (
        <section className="zl-section zl-section--tight">
          <div className="zl-wrap">
            <SectionHead eyebrow="Reciente" title="Retoma donde lo dejaste" />
            <div className="zl-rail" data-reveal>
              {recentTracks.map(t => {
                const on = playingId === t.id;
                return (
                  <button key={t.id} className="zl-release" onClick={() => toggle(t, recentTracks)} aria-label={`Reproducir ${t.title}`}>
                    <div style={{ position: "relative" }}>
                      <Cover variant={t.cover} glyph={t.glyph} image={t.coverImage} />
                      <span className="zl-release__play" style={on ? { opacity: 1, transform: "translateY(0) scale(1)" } : undefined}>
                        {on && player.isPlaying ? <Pause size={18} /> : <Play size={18} />}
                      </span>
                    </div>
                    {/* Sin BPM — solo artista y mood */}
                    <div className="zl-release__title">{t.title}</div>
                    <div className="zl-release__meta">{t.artist} · {t.mood}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── ESTACIONES — Spotify style: pon play y deja que corra ── */}
      <section className="zl-section">
        <div className="zl-wrap">
          <SectionHead
            eyebrow="Estaciones"
            title="Pon play y desconéctate"
            desc="Cada estación tiene su propio universo sonoro. Dale play y deja que la música fluya."
          />
          <div
            data-reveal
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}
            className="zl-radio-playlist-grid"
          >
            {EDITORIAL_PLAYLISTS.map(pl => (
              <StationCard
                key={pl.id}
                playlist={pl}
                trackCount={tracksForStation(tracks, pl).length}
                playing={isStationPlaying(pl)}
                onPlay={() => playStation(pl)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── NUEVO EN RADIO ── */}
      {newTracks.length > 0 && (
        <section className="zl-section zl-section--tight">
          <div className="zl-wrap">
            <SectionHead
              eyebrow="Nuevo"
              title="Recién llegado"
              desc="Acabas de ser de los primeros en escucharlo."
            />
            <div data-reveal style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 22 }} className="zl-radio-new-grid">
              {newTracks.map(t => {
                const on = playingId === t.id;
                return (
                  <button key={t.id} className="zl-release" onClick={() => toggle(t, newTracks)} aria-label={`Escuchar ${t.title}`}>
                    <div style={{ position: "relative" }}>
                      <Cover variant={t.cover} glyph={t.glyph} image={t.coverImage} />
                      <span className="zl-pill-new" style={{ position: "absolute", top: 12, left: 12 }}>Nuevo</span>
                      <span className="zl-release__play" style={on ? { opacity: 1, transform: "translateY(0) scale(1)" } : undefined}>
                        {on && player.isPlaying ? <Pause size={18} /> : <Play size={18} />}
                      </span>
                    </div>
                    <div className="zl-release__title">{t.title}</div>
                    {/* Sin BPM — solo artista y sentimiento */}
                    <div className="zl-release__meta">{t.artist} · {t.mood}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── TRENDING — Lo que está sonando ── */}
      {trending.length > 0 && (
        <section className="zl-section zl-section--tight">
          <div className="zl-wrap">
            <SectionHead
              eyebrow="Trending"
              title="Lo que está sonando ahora"
            />
            <div className="zl-rail" data-reveal>
              {trending.map(t => {
                const on = playingId === t.id;
                return (
                  <button key={t.id} className="zl-release" onClick={() => toggle(t, trending)} aria-label={`Escuchar ${t.title}`}>
                    <div style={{ position: "relative" }}>
                      <Cover variant={t.cover} glyph={t.glyph} image={t.coverImage} />
                      <span className="zl-release__play" style={on ? { opacity: 1, transform: "translateY(0) scale(1)" } : undefined}>
                        {on && player.isPlaying ? <Pause size={18} /> : <Play size={18} />}
                      </span>
                    </div>
                    <div className="zl-release__title">{t.title}</div>
                    <div className="zl-release__meta">{t.artist} · {t.mood}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── SELECCIÓN EDITORIAL ── */}
      {staffHero && (
        <section className="zl-section">
          <div className="zl-wrap">
            <SectionHead
              eyebrow="Selección editorial"
              title="Lo que escuchamos esta semana"
              desc="Una sola pieza elegida con cuidado, y lo que viene después."
            />
            <div data-reveal style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 40, alignItems: "stretch" }} className="zl-radio-staff-grid">
              <button className="zl-release" onClick={() => toggle(staffHero, [staffHero, ...staffPicks])} style={{ position: "relative" }} aria-label={`Escuchar ${staffHero.title}`}>
                <div style={{ position: "relative", borderRadius: "var(--r-lg)", overflow: "hidden", aspectRatio: "16/11" }}>
                  {staffHero.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={staffHero.coverImage} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ position: "absolute", inset: 0, background: COVERS[staffHero.cover] }} />
                  )}
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 35%, rgba(0,0,0,0.82))" }} />
                  <span className="zl-release__play" style={{ width: 56, height: 56, ...(playingId === staffHero.id ? { opacity: 1, transform: "translateY(0) scale(1)" } : {}) }}>
                    {playingId === staffHero.id && player.isPlaying ? <Pause size={22} /> : <Play size={22} />}
                  </span>
                  <div style={{ position: "absolute", left: 24, bottom: 22, right: 24 }}>
                    <div style={{ fontSize: "1.7rem", fontWeight: 700, letterSpacing: "-0.02em", color: "#fff" }}>{staffHero.title}</div>
                    {/* Solo artista y mood — no BPM */}
                    <div style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.7)", marginTop: 4 }}>{staffHero.artist} · {staffHero.mood}</div>
                  </div>
                </div>
              </button>

              <div style={{ display: "flex", flexDirection: "column" }}>
                {staffHero.staffNote && (
                  <div className="zl-card" style={{ padding: 22, marginBottom: 14 }}>
                    <p style={{ fontSize: "1rem", lineHeight: 1.65, color: "var(--text)", fontWeight: 500 }}>
                      &ldquo;{staffHero.staffNote}&rdquo;
                    </p>
                    <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
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
                      <button key={t.id} className={`zl-track${on ? " is-playing" : ""}`} onClick={() => toggle(t, [staffHero, ...staffPicks])} style={{ gridTemplateColumns: "26px 44px 1fr auto", ...(!t.audioUrl ? { opacity: 0.42, cursor: "default" } : {}) }} aria-label={`Escuchar ${t.title}`}>
                        <span className="zl-track__rank">{on ? (player.isPlaying ? <Pause size={12} /> : <Play size={12} />) : i + 1}</span>
                        <span style={{ width: 44, height: 44 }}><Cover variant={t.cover} glyph={t.glyph} radius={9} image={t.coverImage} /></span>
                        <span style={{ minWidth: 0 }}>
                          <span className="zl-track__title" style={{ display: "block" }}>{t.title}</span>
                          {/* Mood en vez de BPM */}
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

      {/* ── ¿QUÉ QUIERES SENTIR? — Moods, no géneros para licenciar ── */}
      {moods.length > 0 && (
        <section className="zl-section zl-section--tight">
          <div className="zl-wrap">
            <SectionHead
              eyebrow="Descubrir"
              title="¿Qué quieres sentir?"
              desc="No busques un género. Busca una emoción."
            />
            <div
              data-reveal
              style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}
              className="zl-radio-mood-grid"
            >
              {moods.map(m => {
                const first = tracks.find(t => t.mood.toLowerCase().includes(m.name.toLowerCase().split(" ")[0]) && !!t.audioUrl);
                return (
                  <button
                    key={m.slug}
                    className="zl-collection"
                    style={{ aspectRatio: "3/2" }}
                    onClick={() => { if (first) playMood(m.name); }}
                    aria-label={`Escuchar mood ${m.name}`}
                  >
                    <div className="zl-collection__bg" style={{ background: COVERS[m.cover] }} />
                    <div className="zl-collection__shade" />
                    <div className="zl-collection__body" style={{ padding: 22 }}>
                      <div style={{ marginTop: "auto" }}>
                        <div className="zl-collection__name">{m.name}</div>
                        <div className="zl-collection__count">{m.trackCount} tracks</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── ZOUNDLIST ORIGINALS — Arquitectura lista, desactivada hasta el lanzamiento ── */}
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

      {/* ── FOOTER — Sin links de licencias ni precios. Radio es para escuchar ── */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: "40px 0", position: "relative", zIndex: 1 }}>
        <div className="zl-wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <Brand height={20} />
            <span className="zl-tag" style={{ color: "var(--text-3)" }}>Radio</span>
          </div>
          <ul style={{ display: "flex", gap: 20, listStyle: "none", flexWrap: "wrap" }}>
            <li><a href="/" className="zl-foot-link">Explorar catálogo</a></li>
            <li><a href="/privacidad" className="zl-foot-link">Privacidad</a></li>
          </ul>
          <p style={{ fontSize: "0.78rem", color: "var(--text-3)" }}>© 2026 Zoundlist</p>
        </div>
      </footer>

      <style>{`
        @media (max-width: 1024px) {
          .zl-radio-hero-grid { grid-template-columns: 1fr !important; gap: 36px !important; }
          .zl-radio-hero-grid > :first-child { display: flex; justify-content: center; }
          .zl-radio-hero-grid > :first-child > div { width: 220px !important; height: 220px !important; }
        }
        @media (max-width: 980px) {
          .zl-radio-playlist-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .zl-radio-staff-grid    { grid-template-columns: 1fr !important; }
          .zl-radio-mood-grid     { grid-template-columns: repeat(2, 1fr) !important; }
          .zl-radio-new-grid      { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 600px) {
          .zl-radio-playlist-grid { grid-template-columns: 1fr !important; }
          .zl-radio-mood-grid     { grid-template-columns: 1fr !important; }
          .zl-radio-new-grid      { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </>
  );
}
