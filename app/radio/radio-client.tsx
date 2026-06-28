"use client";

import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import type { Catalog, Track, CoverVariant } from "@/types/catalog";
import { COVERS } from "@/lib/catalog/covers";
import { Cover } from "@/components/ui/Cover";
import { Brand } from "@/components/brand";
import { usePlayer } from "@/lib/player/context";
import { loadPlayer } from "@/lib/player/storage";
import type { PlayerTrack } from "@/lib/player/types";
import { EDITORIAL_PLAYLISTS, ORIGINALS_CONFIG } from "@/lib/radio/playlists";
import type { EditorialPlaylist } from "@/lib/radio/types";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

// ── Helpers ───────────────────────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 18) return "Buenas tardes";
  return "Buenas noches";
}

function toPlayerTrack(t: Track): PlayerTrack | null {
  if (!t.audioUrl) return null;
  return {
    id: t.id, title: t.title, artist: t.artist,
    audioUrl: t.audioUrl, cover: t.cover, coverImage: t.coverImage ?? null,
    duration: t.duration, albumId: null,
  };
}

function tracksForStation(tracks: Track[], pl: EditorialPlaylist): Track[] {
  return tracks.filter(t =>
    pl.genreSlugs.includes(t.genre) ||
    pl.moodKeywords.some(k => t.mood.toLowerCase().includes(k.toLowerCase()))
  );
}

// ── Derive unique artists ─────────────────────────────────────────────────────
const VARIANTS: CoverVariant[] = ["violet", "lime", "orange", "magenta", "teal", "gold", "ice", "ember"];
function getArtists(tracks: Track[]): { name: string; trackCount: number; variant: CoverVariant }[] {
  const countMap   = new Map<string, number>();
  const variantMap = new Map<string, CoverVariant>();
  let idx = 0;
  for (const t of tracks) {
    countMap.set(t.artist, (countMap.get(t.artist) ?? 0) + 1);
    if (!variantMap.has(t.artist)) { variantMap.set(t.artist, VARIANTS[idx % VARIANTS.length]); idx++; }
  }
  return [...countMap.entries()]
    .map(([name, trackCount]) => ({ name, trackCount, variant: variantMap.get(name)! }))
    .sort((a, b) => b.trackCount - a.trackCount)
    .slice(0, 12);
}

// ── Like helpers (localStorage) ───────────────────────────────────────────────
const LIKED_KEY = "zl_liked_tracks";
function getLiked(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) ?? "[]")); }
  catch { return new Set(); }
}
function mutateLiked(id: string): boolean {
  const s = getLiked();
  s.has(id) ? s.delete(id) : s.add(id);
  localStorage.setItem(LIKED_KEY, JSON.stringify([...s]));
  return s.has(id);
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const PlayI  = ({ s = 18 }: { s?: number }) => <svg viewBox="0 0 24 24" width={s} height={s} fill="currentColor"><path d="M8 5v14l11-7z"/></svg>;
const PauseI = ({ s = 18 }: { s?: number }) => <svg viewBox="0 0 24 24" width={s} height={s} fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>;
const HomeI  = () => <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>;
const WaveI  = () => <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm9-2.17v10.34c1.86-.95 3-2.85 3-5.17s-1.14-4.22-3-5.17z"/><path d="M16.5 12A4.5 4.5 0 0014 7.97v8.05A4.5 4.5 0 0016.5 12z"/></svg>;
const MoodI  = () => <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM9.5 15.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm5 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1-6.5c0 1.66-1.34 3-3 3s-3-1.34-3-3h6z"/></svg>;
const BackI  = () => <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>;
const HeartI = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 24 24" width={16} height={16}
    fill={on ? "var(--brand)" : "none"}
    stroke={on ? "var(--brand)" : "currentColor"} strokeWidth="2">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

// ── Section heading ────────────────────────────────────────────────────────────
function SecH({ title }: { title: string }) {
  return (
    <h2 style={{ fontSize: "1.45rem", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text)", marginBottom: 20 }}>
      {title}
    </h2>
  );
}

// ── Quick play compact card (Spotify home grid) ───────────────────────────────
function QuickItem({ track, active, playing, onPlay }: {
  track: Track; active: boolean; playing: boolean; onPlay: () => void;
}) {
  return (
    <button className={`zl-radio-qitem${active ? " is-active" : ""}`} onClick={onPlay} aria-label={`Escuchar ${track.title}`}>
      <div style={{ width: 64, height: 64, flexShrink: 0, borderRadius: "6px 0 0 6px", overflow: "hidden" }}>
        <Cover variant={track.cover} image={track.coverImage} />
      </div>
      <span style={{
        flex: 1, fontSize: "0.88rem", fontWeight: 700, textAlign: "left",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        padding: "0 12px 0 14px", color: active ? "var(--brand)" : "var(--text)"
      }}>
        {track.title}
      </span>
      <span className={`zl-radio-qitem__play${active ? " is-on" : ""}`}>
        {active && playing ? <PauseI s={16} /> : <PlayI s={16} />}
      </span>
    </button>
  );
}

// ── Mix card (Spotify playlist aesthetic) ─────────────────────────────────────
function MixCard({ playlist, trackCount, active, playing, onPlay }: {
  playlist: EditorialPlaylist; trackCount: number; active: boolean; playing: boolean; onPlay: () => void;
}) {
  return (
    <button className="zl-radio-mix" onClick={onPlay} aria-label={`Escuchar ${playlist.title}`}>
      <div className="zl-radio-mix__art">
        {playlist.coverImage
          ? <img src={playlist.coverImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ width: "100%", height: "100%", background: COVERS[playlist.coverVariant] }} />
        }
      </div>
      <div className={`zl-radio-mix__play${active && playing ? " is-on" : ""}`}>
        {active && playing ? <PauseI s={20} /> : <PlayI s={20} />}
      </div>
      <div className="zl-radio-mix__body">
        <div className="zl-radio-mix__title">{playlist.title}</div>
        <div className="zl-radio-mix__desc">{playlist.description}</div>
        {trackCount > 0 && <div className="zl-radio-mix__count">{trackCount} tracks</div>}
      </div>
    </button>
  );
}

// ── Trending row (div outer to allow nested like button) ──────────────────────
function TrendRow({ track, rank, active, playing, onPlay }: {
  track: Track; rank: number; active: boolean; playing: boolean; onPlay: () => void;
}) {
  const [liked, setLiked] = useState(false);
  useEffect(() => { setLiked(getLiked().has(track.id)); }, [track.id]);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked(mutateLiked(track.id));
  };

  return (
    <div
      className={`zl-radio-row${active ? " is-playing" : ""}`}
      role="button"
      tabIndex={0}
      onClick={onPlay}
      onKeyDown={e => e.key === "Enter" && onPlay()}
      aria-label={`Escuchar ${track.title}`}
    >
      <span className="zl-radio-row__rank">
        {active ? (playing ? <PauseI s={14} /> : <PlayI s={14} />) : rank}
      </span>
      <span style={{ width: 44, height: 44, borderRadius: 4, overflow: "hidden", display: "block", flexShrink: 0 }}>
        <Cover variant={track.cover} image={track.coverImage} radius={4} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span className="zl-radio-row__title">{track.title}</span>
        <span className="zl-radio-row__artist">{track.artist}</span>
      </span>
      <span className="zl-radio-row__mood zl-hide-sm">{track.mood}</span>
      <button className="zl-radio-row__like" onClick={handleLike} aria-label={liked ? "Quitar me gusta" : "Me gusta"}>
        <HeartI on={liked} />
      </button>
      <span className="zl-radio-row__dur">{track.duration}</span>
    </div>
  );
}

// ── Small card (horizontal scroll) ───────────────────────────────────────────
function SmallCard({ track, active, playing, onPlay }: {
  track: Track; active: boolean; playing: boolean; onPlay: () => void;
}) {
  return (
    <button className="zl-radio-card" onClick={onPlay} aria-label={`Escuchar ${track.title}`}>
      <div className="zl-radio-card__art">
        <Cover variant={track.cover} image={track.coverImage} glyph={track.glyph} radius={8} />
        <div className={`zl-radio-card__play${active ? " is-on" : ""}`}>
          {active && playing ? <PauseI /> : <PlayI />}
        </div>
      </div>
      <div className="zl-radio-card__title">{track.title}</div>
      <div className="zl-radio-card__sub">{track.artist}</div>
    </button>
  );
}

// ── Circular artist card ──────────────────────────────────────────────────────
function ArtistCard({ name, trackCount, variant, onPlay }: {
  name: string; trackCount: number; variant: CoverVariant; onPlay: () => void;
}) {
  return (
    <button className="zl-radio-artist" onClick={onPlay} aria-label={`Escuchar ${name}`}>
      <div className="zl-radio-artist__avatar" style={{ background: COVERS[variant] }}>
        <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.8rem", opacity: 0.35, color: "#fff" }}>♪</span>
      </div>
      <span className="zl-radio-artist__name">{name}</span>
      <span className="zl-radio-artist__sub">{trackCount} {trackCount === 1 ? "track" : "tracks"}</span>
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function RadioClient({ catalog }: { catalog: Catalog }) {
  const { tracks, moods } = catalog;

  const player    = usePlayer();
  const playingId = player.track?.id ?? null;
  const audioTracks = tracks.map(toPlayerTrack).filter((t): t is PlayerTrack => t !== null);

  const [user,            setUser]            = useState<User | null>(null);
  const [recentTracks,    setRecentTracks]    = useState<Track[]>([]);
  const [greeting,        setGreeting]        = useState("");
  const [mobileSidebarOn, setMobileSidebarOn] = useState(false);

  const featured   = tracks.filter(t => t.staffHero || t.featured || t.staffPick);
  const quickItems = [...featured, ...tracks.filter(t => !featured.includes(t))].slice(0, 6);
  const trending   = tracks.filter(t => t.trending);
  const newTracks  = tracks.filter(t => t.isNew);
  const artists    = getArtists(tracks);

  useEffect(() => { setGreeting(getGreeting()); }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const saved = loadPlayer();
    if (saved.queue?.length) {
      const ids = new Set(saved.queue.map(pt => pt.id));
      setRecentTracks(tracks.filter(t => ids.has(t.id)).slice(0, 6));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Player helpers ──────────────────────────────────────────────────────────
  const toggle = (t: Track, queue?: Track[]) => {
    const pt = toPlayerTrack(t);
    if (!pt) return;
    if (playingId === t.id) { player.togglePlay(); return; }
    const q = (queue ?? [t]).map(toPlayerTrack).filter((x): x is PlayerTrack => x !== null);
    player.playTrack(pt, q.length ? q : audioTracks);
  };

  const playStation = (pl: EditorialPlaylist) => {
    const q = tracksForStation(tracks, pl).map(toPlayerTrack).filter((x): x is PlayerTrack => x !== null);
    if (!q.length) return;
    player.playTrack(q[0], q);
  };

  const isStationActive = (pl: EditorialPlaylist) =>
    !!playingId && tracksForStation(tracks, pl).some(t => t.id === playingId);

  const playArtist = (name: string) => {
    const q = tracks.filter(t => t.artist === name).map(toPlayerTrack).filter((x): x is PlayerTrack => x !== null);
    if (!q.length) return;
    player.playTrack(q[0], q);
  };

  const playMood = (moodName: string) => {
    const q = tracks
      .filter(t => t.mood.toLowerCase().includes(moodName.toLowerCase().split(" ")[0]) && !!t.audioUrl)
      .map(toPlayerTrack)
      .filter((x): x is PlayerTrack => x !== null);
    if (!q.length) return;
    player.playTrack(q[0], q);
  };

  return (
    <div className="zl-radio-app">

      {/* ── SIDEBAR ──────────────────────────────────────────────────────────── */}
      <aside className={`zl-radio-sidebar${mobileSidebarOn ? " is-open" : ""}`}>

        <div className="zl-radio-sb-brand">
          <Brand height={20} />
          <span className="zl-radio-sb-badge">Radio</span>
        </div>

        <nav className="zl-radio-sb-nav">
          <a href="/radio" className="zl-radio-sb-link is-active">
            <HomeI /><span>Inicio</span>
          </a>
          <a href="#stations" className="zl-radio-sb-link" onClick={() => setMobileSidebarOn(false)}>
            <WaveI /><span>Estaciones</span>
          </a>
          <a href="#moods" className="zl-radio-sb-link" onClick={() => setMobileSidebarOn(false)}>
            <MoodI /><span>Estados de ánimo</span>
          </a>
        </nav>

        <div className="zl-radio-sb-sep" />

        {recentTracks.length > 0 && (
          <div className="zl-radio-sb-recents">
            <p className="zl-radio-sb-recents__label">Recientes</p>
            {recentTracks.map(t => (
              <button
                key={t.id}
                className={`zl-radio-sb-item${playingId === t.id ? " is-playing" : ""}`}
                onClick={() => { toggle(t); setMobileSidebarOn(false); }}
                aria-label={`Reproducir ${t.title}`}
              >
                <div style={{ width: 36, height: 36, borderRadius: 4, overflow: "hidden", flexShrink: 0 }}>
                  <Cover variant={t.cover} image={t.coverImage} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    fontSize: "0.8rem", fontWeight: 600,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    color: playingId === t.id ? "var(--brand)" : "var(--text)"
                  }}>
                    {t.title}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-3)" }}>{t.artist}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div style={{ marginTop: "auto" }}>
          <div className="zl-radio-sb-sep" />
          <a href="/" className="zl-radio-sb-back"><BackI /> Volver a Zoundlist</a>
          {user && <a href="/dashboard" className="zl-radio-sb-back" style={{ marginTop: 4 }}>Mi panel</a>}
        </div>
      </aside>

      {/* ── Mobile hamburger ─────────────────────────────────────────────────── */}
      <button
        className="zl-radio-hamburger"
        onClick={() => setMobileSidebarOn(v => !v)}
        aria-label={mobileSidebarOn ? "Cerrar menú" : "Abrir menú"}
      >
        <span /><span /><span />
      </button>
      {mobileSidebarOn && (
        <div className="zl-radio-overlay" onClick={() => setMobileSidebarOn(false)} aria-hidden="true" />
      )}

      {/* ── MAIN ─────────────────────────────────────────────────────────────── */}
      <main className="zl-radio-main">

        {/* Greeting + quick play ───────────────────────────────────────────── */}
        <section className="zl-radio-greeting">
          <h1 className="zl-radio-greeting__title">{greeting || "Bienvenido"}</h1>
          <div className="zl-radio-quick">
            {quickItems.map(t => (
              <QuickItem
                key={t.id}
                track={t}
                active={playingId === t.id}
                playing={player.isPlaying}
                onPlay={() => toggle(t, quickItems)}
              />
            ))}
          </div>
        </section>

        {/* Mix del día ─────────────────────────────────────────────────────── */}
        <section id="stations" className="zl-radio-section">
          <div className="zl-radio-pad">
            <SecH title="Mix del día" />
            <div className="zl-radio-mix-grid">
              {EDITORIAL_PLAYLISTS.map(pl => (
                <MixCard
                  key={pl.id}
                  playlist={pl}
                  trackCount={tracksForStation(tracks, pl).length}
                  active={isStationActive(pl)}
                  playing={player.isPlaying}
                  onPlay={() => playStation(pl)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Lo que está sonando ─────────────────────────────────────────────── */}
        {trending.length > 0 && (
          <section className="zl-radio-section">
            <div className="zl-radio-pad">
              <SecH title="Lo que está sonando" />
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {trending.slice(0, 10).map((t, i) => (
                  <TrendRow
                    key={t.id}
                    track={t}
                    rank={i + 1}
                    active={playingId === t.id}
                    playing={player.isPlaying}
                    onPlay={() => toggle(t, trending)}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Nuevos sonidos ──────────────────────────────────────────────────── */}
        {newTracks.length > 0 && (
          <section className="zl-radio-section">
            <div className="zl-radio-pad">
              <SecH title="Nuevos sonidos" />
              <div className="zl-radio-hscroll">
                {newTracks.map(t => (
                  <SmallCard
                    key={t.id}
                    track={t}
                    active={playingId === t.id}
                    playing={player.isPlaying}
                    onPlay={() => toggle(t, newTracks)}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Estados de ánimo ────────────────────────────────────────────────── */}
        {moods.length > 0 && (
          <section id="moods" className="zl-radio-section">
            <div className="zl-radio-pad">
              <SecH title="¿Qué quieres sentir?" />
              <div className="zl-radio-mood-grid">
                {moods.map(m => {
                  const hasTracks = tracks.some(
                    t => t.mood.toLowerCase().includes(m.name.toLowerCase().split(" ")[0]) && !!t.audioUrl
                  );
                  return (
                    <button
                      key={m.slug}
                      className="zl-radio-mood"
                      onClick={() => playMood(m.name)}
                      aria-label={`Escuchar ${m.name}`}
                      disabled={!hasTracks}
                    >
                      <div className="zl-radio-mood__bg" style={{ background: COVERS[m.cover] }} />
                      <span className="zl-radio-mood__name">{m.name}</span>
                      <span className="zl-radio-mood__count">{m.trackCount} tracks</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Artistas ────────────────────────────────────────────────────────── */}
        {artists.length > 0 && (
          <section className="zl-radio-section">
            <div className="zl-radio-pad">
              <SecH title="Artistas que debes escuchar" />
              <div className="zl-radio-hscroll">
                {artists.map(a => (
                  <ArtistCard
                    key={a.name}
                    name={a.name}
                    trackCount={a.trackCount}
                    variant={a.variant}
                    onPlay={() => playArtist(a.name)}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Originals (disabled by default) ────────────────────────────────── */}
        {ORIGINALS_CONFIG.enabled && (
          <section className="zl-radio-section">
            <div className="zl-radio-pad">
              <div className="zl-originals">
                <div className="zl-originals__label">✦ {ORIGINALS_CONFIG.labelName}</div>
                <h2 className="zl-h2" style={{ marginTop: 16, marginBottom: 14 }}>{ORIGINALS_CONFIG.tagline}</h2>
                <p style={{ color: "var(--text-2)", maxWidth: 480, fontSize: "0.95rem", lineHeight: 1.65 }}>
                  {ORIGINALS_CONFIG.comingSoonText}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Footer ──────────────────────────────────────────────────────────── */}
        <div className="zl-radio-main-footer">
          <p style={{ fontSize: "0.78rem", color: "var(--text-3)" }}>© 2026 Zoundlist · JM Creativos LLC</p>
          <a href="/privacidad" style={{ fontSize: "0.78rem", color: "var(--text-3)", textDecoration: "none" }}>Privacidad</a>
        </div>
      </main>
    </div>
  );
}
