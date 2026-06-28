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
  return { id: t.id, title: t.title, artist: t.artist, audioUrl: t.audioUrl, cover: t.cover, coverImage: t.coverImage ?? null, duration: t.duration, albumId: null };
}

function tracksForStation(tracks: Track[], pl: EditorialPlaylist): Track[] {
  return tracks.filter(t => pl.genreSlugs.includes(t.genre) || pl.moodKeywords.some(k => t.mood.toLowerCase().includes(k.toLowerCase())));
}

const VARIANTS: CoverVariant[] = ["violet", "lime", "orange", "magenta", "teal", "gold", "ice", "ember"];
function getArtists(tracks: Track[]): { name: string; trackCount: number; variant: CoverVariant }[] {
  const countMap = new Map<string, number>();
  const varMap   = new Map<string, CoverVariant>();
  let idx = 0;
  for (const t of tracks) {
    countMap.set(t.artist, (countMap.get(t.artist) ?? 0) + 1);
    if (!varMap.has(t.artist)) { varMap.set(t.artist, VARIANTS[idx % VARIANTS.length]); idx++; }
  }
  return [...countMap.entries()].map(([name, trackCount]) => ({ name, trackCount, variant: varMap.get(name)! })).sort((a, b) => b.trackCount - a.trackCount).slice(0, 12);
}

const LIKED_KEY = "zl_liked_tracks";
function getLiked(): Set<string> { try { return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) ?? "[]")); } catch { return new Set(); } }
function mutateLiked(id: string): boolean { const s = getLiked(); s.has(id) ? s.delete(id) : s.add(id); localStorage.setItem(LIKED_KEY, JSON.stringify([...s])); return s.has(id); }

// ── Icons ─────────────────────────────────────────────────────────────────────
const PlayI  = ({ s = 18 }: { s?: number }) => <svg viewBox="0 0 24 24" width={s} height={s} fill="currentColor"><path d="M8 5v14l11-7z"/></svg>;
const PauseI = ({ s = 18 }: { s?: number }) => <svg viewBox="0 0 24 24" width={s} height={s} fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>;
const HomeI  = () => <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>;
const WaveI  = () => <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm9-2.17v10.34c1.86-.95 3-2.85 3-5.17s-1.14-4.22-3-5.17z"/><path d="M16.5 12A4.5 4.5 0 0014 7.97v8.05A4.5 4.5 0 0016.5 12z"/></svg>;
const MoodI  = () => <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM9.5 15.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm5 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1-6.5c0 1.66-1.34 3-3 3s-3-1.34-3-3h6z"/></svg>;
const HeartI = ({ on }: { on: boolean }) => <svg viewBox="0 0 24 24" width={16} height={16} fill={on ? "var(--brand)" : "none"} stroke={on ? "var(--brand)" : "currentColor"} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;

// ── Sidebar nav link ──────────────────────────────────────────────────────────
function SbLink({ href, icon, label, active, onClick }: { href: string; icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <a href={href} onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "10px 12px", borderRadius: 8,
      color: active ? "#fff" : "rgba(255,255,255,0.6)", textDecoration: "none",
      fontSize: "0.9rem", fontWeight: 600,
    }}>
      {icon}<span>{label}</span>
    </a>
  );
}

// ── Section heading ────────────────────────────────────────────────────────────
function SecH({ title }: { title: string }) {
  return <h2 style={{ fontSize: "1.4rem", fontWeight: 700, letterSpacing: "-0.02em", color: "#fff", marginBottom: 20 }}>{title}</h2>;
}

// ── Quick play compact item (Spotify home grid) ───────────────────────────────
function QuickItem({ track, active, playing, onPlay }: { track: Track; active: boolean; playing: boolean; onPlay: () => void }) {
  return (
    <button
      onClick={onPlay}
      aria-label={`Escuchar ${track.title}`}
      style={{
        display: "flex", alignItems: "center",
        background: active ? "rgba(149,249,8,0.1)" : "rgba(255,255,255,0.08)",
        borderRadius: 6, overflow: "hidden",
        border: "none", cursor: "pointer", height: 64,
        color: "#fff", textAlign: "left", width: "100%",
        transition: "background 0.15s",
      }}
    >
      <div style={{ width: 64, height: 64, flexShrink: 0 }}>
        <Cover variant={track.cover} image={track.coverImage} />
      </div>
      <span style={{
        flex: 1, fontSize: "0.87rem", fontWeight: 700,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        padding: "0 14px", color: active ? "var(--brand)" : "#fff"
      }}>
        {track.title}
      </span>
      <span style={{
        width: 44, height: 44, borderRadius: "50%",
        background: "var(--brand)", color: "var(--brand-ink)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, marginRight: 10,
        opacity: active ? 1 : 0,
        boxShadow: "0 4px 16px rgba(149,249,8,0.35)",
        transition: "opacity 0.2s",
      }} className="qitem-play">
        {active && playing ? <PauseI s={16} /> : <PlayI s={16} />}
      </span>
    </button>
  );
}

// ── Mix card (Spotify playlist card) ─────────────────────────────────────────
function MixCard({ playlist, trackCount, active, playing, onPlay }: { playlist: EditorialPlaylist; trackCount: number; active: boolean; playing: boolean; onPlay: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onPlay}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={`Escuchar ${playlist.title}`}
      style={{
        position: "relative", borderRadius: 8, overflow: "hidden",
        border: "none", cursor: "pointer", background: "#171717",
        textAlign: "left", padding: 0, display: "block", width: "100%",
        transform: hovered ? "translateY(-4px)" : "none",
        boxShadow: hovered ? "0 20px 60px rgba(0,0,0,0.55)" : "none",
        transition: "transform 0.2s ease, box-shadow 0.2s",
      }}
    >
      {/* Cover art — square */}
      <div style={{ width: "100%", aspectRatio: "1", overflow: "hidden" }}>
        {playlist.coverImage
          ? <img src={playlist.coverImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ width: "100%", height: "100%", background: COVERS[playlist.coverVariant] }} />
        }
      </div>
      {/* Play button (hover) */}
      <div style={{
        position: "absolute", right: 12, bottom: 72,
        width: 44, height: 44, borderRadius: "50%",
        background: "var(--brand)", color: "var(--brand-ink)",
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: (hovered || active) ? 1 : 0,
        transform: (hovered || active) ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.2s, transform 0.2s",
        boxShadow: "0 8px 24px rgba(149,249,8,0.4)",
      }}>
        {active && playing ? <PauseI s={20} /> : <PlayI s={20} />}
      </div>
      {/* Info */}
      <div style={{ padding: "12px 14px 16px" }}>
        <div style={{ fontSize: "0.94rem", fontWeight: 700, color: "#fff", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {playlist.title}
        </div>
        <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>
          {playlist.description}
        </div>
        {trackCount > 0 && (
          <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.38)", marginTop: 6 }}>{trackCount} tracks</div>
        )}
      </div>
    </button>
  );
}

// ── Trending row ──────────────────────────────────────────────────────────────
function TrendRow({ track, rank, active, playing, onPlay }: { track: Track; rank: number; active: boolean; playing: boolean; onPlay: () => void }) {
  const [liked, setLiked] = useState(false);
  const [hovered, setHovered] = useState(false);
  useEffect(() => { setLiked(getLiked().has(track.id)); }, [track.id]);
  const handleLike = (e: React.MouseEvent) => { e.stopPropagation(); setLiked(mutateLiked(track.id)); };
  return (
    <div
      role="button" tabIndex={0}
      onClick={onPlay} onKeyDown={e => e.key === "Enter" && onPlay()}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      aria-label={`Escuchar ${track.title}`}
      style={{
        display: "grid",
        gridTemplateColumns: "24px 44px 1fr auto auto auto",
        gap: 14, alignItems: "center",
        padding: "8px 14px", borderRadius: 6,
        cursor: "pointer", color: "#fff", textAlign: "left",
        background: active ? "rgba(149,249,8,0.06)" : hovered ? "rgba(255,255,255,0.06)" : "transparent",
        transition: "background 0.15s", width: "100%",
      }}
    >
      <span style={{ fontSize: "0.88rem", fontWeight: 700, color: active ? "var(--brand)" : "rgba(255,255,255,0.42)", textAlign: "center" }}>
        {active ? (playing ? <PauseI s={14} /> : <PlayI s={14} />) : rank}
      </span>
      <span style={{ width: 44, height: 44, borderRadius: 4, overflow: "hidden", display: "block", flexShrink: 0 }}>
        <Cover variant={track.cover} image={track.coverImage} radius={4} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ fontSize: "0.91rem", fontWeight: 600, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: active ? "var(--brand)" : "#fff" }}>
          {track.title}
        </span>
        <span style={{ fontSize: "0.77rem", color: "rgba(255,255,255,0.42)", display: "block" }}>{track.artist}</span>
      </span>
      <span style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.42)", whiteSpace: "nowrap" }}>{track.mood}</span>
      <button onClick={handleLike} aria-label={liked ? "Quitar me gusta" : "Me gusta"}
        style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", padding: 6, opacity: hovered || liked ? 1 : 0, transition: "opacity 0.15s" }}>
        <HeartI on={liked} />
      </button>
      <span style={{ fontSize: "0.79rem", color: "rgba(255,255,255,0.42)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{track.duration}</span>
    </div>
  );
}

// ── Small card (horizontal scroll) ───────────────────────────────────────────
function SmallCard({ track, active, playing, onPlay }: { track: Track; active: boolean; playing: boolean; onPlay: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={onPlay} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      aria-label={`Escuchar ${track.title}`}
      style={{ flexShrink: 0, width: 170, border: "none", background: "transparent", cursor: "pointer", textAlign: "left", color: "#fff", padding: 0 }}>
      <div style={{ width: 170, height: 170, borderRadius: 10, overflow: "hidden", position: "relative", marginBottom: 12, transform: hovered ? "translateY(-4px)" : "none", transition: "transform 0.2s" }}>
        <Cover variant={track.cover} image={track.coverImage} glyph={track.glyph} radius={10} />
        <div style={{
          position: "absolute", right: 10, bottom: 10,
          width: 40, height: 40, borderRadius: "50%",
          background: "var(--brand)", color: "var(--brand-ink)",
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: (hovered || active) ? 1 : 0,
          transform: (hovered || active) ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 0.2s, transform 0.2s",
        }}>
          {active && playing ? <PauseI /> : <PlayI />}
        </div>
      </div>
      <div style={{ fontSize: "0.9rem", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.title}</div>
      <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{track.artist}</div>
    </button>
  );
}

// ── Circular artist card ──────────────────────────────────────────────────────
function ArtistCard({ name, trackCount, variant, onPlay }: { name: string; trackCount: number; variant: CoverVariant; onPlay: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={onPlay} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      aria-label={`Escuchar ${name}`}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, flexShrink: 0, width: 150, border: "none", background: "transparent", cursor: "pointer", textAlign: "center", padding: 0, transform: hovered ? "scale(1.05)" : "scale(1)", transition: "transform 0.2s" }}>
      <div style={{ width: 150, height: 150, borderRadius: "50%", position: "relative", overflow: "hidden", background: COVERS[variant], boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
        <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.8rem", opacity: 0.35, color: "#fff" }}>♪</span>
      </div>
      <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 150 }}>{name}</span>
      <span style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.5)" }}>{trackCount} {trackCount === 1 ? "track" : "tracks"}</span>
    </button>
  );
}

// ── Mood tile ─────────────────────────────────────────────────────────────────
function MoodTile({ mood, onPlay, disabled }: { mood: { slug: string; name: string; cover: CoverVariant; trackCount: number }; onPlay: () => void; disabled: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={onPlay} disabled={disabled} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      aria-label={`Escuchar ${mood.name}`}
      style={{
        position: "relative", borderRadius: 8, overflow: "hidden",
        border: "none", cursor: disabled ? "default" : "pointer",
        height: 100, display: "flex", flexDirection: "column",
        justifyContent: "flex-end", alignItems: "flex-start",
        padding: 16, opacity: disabled ? 0.45 : 1,
        transform: hovered && !disabled ? "scale(1.03)" : "scale(1)",
        transition: "transform 0.2s",
      }}>
      <div style={{ position: "absolute", inset: 0, background: COVERS[mood.cover], transform: hovered ? "scale(1.06)" : "scale(1)", transition: "transform 0.4s" }} />
      <span style={{ position: "relative", fontSize: "1.05rem", fontWeight: 700, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>{mood.name}</span>
      <span style={{ position: "relative", fontSize: "0.72rem", color: "rgba(255,255,255,0.7)", marginTop: 2 }}>{mood.trackCount} tracks</span>
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function RadioClient({ catalog }: { catalog: Catalog }) {
  const { tracks, moods } = catalog;

  const player    = usePlayer();
  const playingId = player.track?.id ?? null;
  const allPT     = tracks.map(toPlayerTrack).filter((t): t is PlayerTrack => t !== null);

  const [user,   setUser]   = useState<User | null>(null);
  const [recent, setRecent] = useState<Track[]>([]);
  const [greeting, setG]   = useState("");
  const [menuOpen, setMenu] = useState(false);

  const featured   = tracks.filter(t => t.staffHero || t.featured || t.staffPick);
  const quickItems = [...featured, ...tracks.filter(t => !featured.includes(t))].slice(0, 6);
  const trending   = tracks.filter(t => t.trending);
  const newTracks  = tracks.filter(t => t.isNew);
  const artists    = getArtists(tracks);

  useEffect(() => { setG(getGreeting()); }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const sb = createClient();
    sb.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const saved = loadPlayer();
    if (saved.queue?.length) {
      const ids = new Set(saved.queue.map(pt => pt.id));
      setRecent(tracks.filter(t => ids.has(t.id)).slice(0, 6));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (t: Track, queue?: Track[]) => {
    const pt = toPlayerTrack(t);
    if (!pt) return;
    if (playingId === t.id) { player.togglePlay(); return; }
    const q = (queue ?? [t]).map(toPlayerTrack).filter((x): x is PlayerTrack => x !== null);
    player.playTrack(pt, q.length ? q : allPT);
  };

  const playStation = (pl: EditorialPlaylist) => {
    const q = tracksForStation(tracks, pl).map(toPlayerTrack).filter((x): x is PlayerTrack => x !== null);
    if (q.length) player.playTrack(q[0], q);
  };

  const isStationActive = (pl: EditorialPlaylist) =>
    !!playingId && tracksForStation(tracks, pl).some(t => t.id === playingId);

  const playMood = (moodName: string) => {
    const q = tracks.filter(t => t.mood.toLowerCase().includes(moodName.toLowerCase().split(" ")[0]) && !!t.audioUrl).map(toPlayerTrack).filter((x): x is PlayerTrack => x !== null);
    if (q.length) player.playTrack(q[0], q);
  };

  // ── Shared constants ────────────────────────────────────────────────────────
  const SB_W = 260;  // sidebar width px
  const PAD  = 40;   // horizontal padding px

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0D0D0D" }}>

      {/* ── SIDEBAR ──────────────────────────────────────────────────────────── */}
      <aside style={{
        width: SB_W, flexShrink: 0, position: "fixed", left: 0, top: 0, bottom: 80,
        background: "#111", borderRight: "1px solid rgba(255,255,255,0.1)",
        overflowY: "auto", zIndex: 50, display: "flex", flexDirection: "column",
        padding: "20px 10px 16px",
        transform: menuOpen ? "translateX(0)" : undefined,
      }} className={`zl-radio-sidebar${menuOpen ? " is-open" : ""}`}>

        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px 22px" }}>
          <Brand height={20} />
          <span style={{
            fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.1em", color: "var(--brand)",
            background: "rgba(149,249,8,0.12)", border: "1px solid rgba(149,249,8,0.3)",
            borderRadius: 4, padding: "2px 7px",
          }}>Radio</span>
        </div>

        {/* Nav */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <SbLink href="/radio" icon={<HomeI />} label="Inicio" active />
          <SbLink href="#stations" icon={<WaveI />} label="Estaciones" onClick={() => setMenu(false)} />
          <SbLink href="#moods" icon={<MoodI />} label="Estados de ánimo" onClick={() => setMenu(false)} />
        </nav>

        <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "14px 8px" }} />

        {/* Recientes */}
        {recent.length > 0 && (
          <div style={{ flex: "0 0 auto" }}>
            <p style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", padding: "0 8px 10px" }}>
              Recientes
            </p>
            {recent.map(t => (
              <button key={t.id} onClick={() => { toggle(t); setMenu(false); }} aria-label={`Reproducir ${t.title}`}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px", borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", width: "100%" }}>
                <div style={{ width: 36, height: 36, borderRadius: 4, overflow: "hidden", flexShrink: 0 }}>
                  <Cover variant={t.cover} image={t.coverImage} />
                </div>
                <div style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
                  <div style={{ fontSize: "0.79rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: playingId === t.id ? "var(--brand)" : "#fff" }}>{t.title}</div>
                  <div style={{ fontSize: "0.69rem", color: "rgba(255,255,255,0.42)" }}>{t.artist}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Bottom links */}
        <div style={{ marginTop: "auto" }}>
          <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "14px 8px" }} />
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", color: "rgba(255,255,255,0.45)", textDecoration: "none", fontSize: "0.82rem", fontWeight: 600, borderRadius: 8 }}>
            <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            Volver a Zoundlist
          </a>
          {user && (
            <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", color: "rgba(255,255,255,0.45)", textDecoration: "none", fontSize: "0.82rem", fontWeight: 600, borderRadius: 8, marginTop: 2 }}>
              Mi panel
            </a>
          )}
        </div>
      </aside>

      {/* ── Mobile hamburger ─────────────────────────────────────────────────── */}
      <button onClick={() => setMenu(v => !v)} aria-label="Menú"
        className="zl-radio-hamburger"
        style={{ display: "none" }}
      >
        <span /><span /><span />
      </button>
      {menuOpen && <div onClick={() => setMenu(false)} aria-hidden="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 48 }} />}

      {/* ── MAIN ─────────────────────────────────────────────────────────────── */}
      <main className="zl-radio-main" style={{ flex: 1, marginLeft: SB_W, paddingBottom: 100, overflowX: "hidden" }}>

        {/* Greeting + Quick Play */}
        <section style={{ padding: `52px ${PAD}px 36px` }}>
          <h1 style={{ fontSize: "clamp(1.8rem, 3vw, 2.6rem)", fontWeight: 700, letterSpacing: "-0.03em", color: "#fff", marginBottom: 22 }}>
            {greeting || "Bienvenido"}
          </h1>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 8 }}>
            {quickItems.map(t => (
              <QuickItem key={t.id} track={t} active={playingId === t.id} playing={player.isPlaying} onPlay={() => toggle(t, quickItems)} />
            ))}
          </div>
        </section>

        {/* Mix del día */}
        <section id="stations" style={{ padding: `0 ${PAD}px 48px` }}>
          <SecH title="Mix del día" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="zl-radio-mix-grid">
            {EDITORIAL_PLAYLISTS.map(pl => (
              <MixCard key={pl.id} playlist={pl} trackCount={tracksForStation(tracks, pl).length} active={isStationActive(pl)} playing={player.isPlaying} onPlay={() => playStation(pl)} />
            ))}
          </div>
        </section>

        {/* Lo que está sonando */}
        {trending.length > 0 && (
          <section style={{ padding: `0 ${PAD}px 48px` }}>
            <SecH title="Lo que está sonando" />
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {trending.slice(0, 10).map((t, i) => (
                <TrendRow key={t.id} track={t} rank={i + 1} active={playingId === t.id} playing={player.isPlaying} onPlay={() => toggle(t, trending)} />
              ))}
            </div>
          </section>
        )}

        {/* Nuevos sonidos */}
        {newTracks.length > 0 && (
          <section style={{ padding: `0 ${PAD}px 48px` }}>
            <SecH title="Nuevos sonidos" />
            <div style={{ display: "flex", gap: 20, overflowX: "auto", paddingBottom: 12, scrollbarWidth: "none" }}>
              {newTracks.map(t => (
                <SmallCard key={t.id} track={t} active={playingId === t.id} playing={player.isPlaying} onPlay={() => toggle(t, newTracks)} />
              ))}
            </div>
          </section>
        )}

        {/* Estados de ánimo */}
        {moods.length > 0 && (
          <section id="moods" style={{ padding: `0 ${PAD}px 48px` }}>
            <SecH title="¿Qué quieres sentir?" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }} className="zl-radio-mood-grid">
              {moods.map(m => {
                const hasTracks = tracks.some(t => t.mood.toLowerCase().includes(m.name.toLowerCase().split(" ")[0]) && !!t.audioUrl);
                return <MoodTile key={m.slug} mood={m} onPlay={() => playMood(m.name)} disabled={!hasTracks} />;
              })}
            </div>
          </section>
        )}

        {/* Artistas */}
        {artists.length > 0 && (
          <section style={{ padding: `0 ${PAD}px 48px` }}>
            <SecH title="Artistas que debes escuchar" />
            <div style={{ display: "flex", gap: 24, overflowX: "auto", paddingBottom: 12, scrollbarWidth: "none" }}>
              {artists.map(a => (
                <ArtistCard key={a.name} name={a.name} trackCount={a.trackCount} variant={a.variant}
                  onPlay={() => { const q = tracks.filter(t => t.artist === a.name).map(toPlayerTrack).filter((x): x is PlayerTrack => x !== null); if (q.length) player.playTrack(q[0], q); }} />
              ))}
            </div>
          </section>
        )}

        {/* Originals */}
        {ORIGINALS_CONFIG.enabled && (
          <section style={{ padding: `0 ${PAD}px 48px` }}>
            <div className="zl-originals">
              <div className="zl-originals__label">✦ {ORIGINALS_CONFIG.labelName}</div>
              <h2 className="zl-h2" style={{ marginTop: 16, marginBottom: 14 }}>{ORIGINALS_CONFIG.tagline}</h2>
              <p style={{ color: "rgba(255,255,255,0.65)", maxWidth: 480, fontSize: "0.95rem", lineHeight: 1.65 }}>{ORIGINALS_CONFIG.comingSoonText}</p>
            </div>
          </section>
        )}

        {/* Footer */}
        <div style={{ padding: `24px ${PAD}px`, display: "flex", gap: 24, alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.35)" }}>© 2026 Zoundlist · JM Creativos LLC</p>
          <a href="/privacidad" style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>Privacidad</a>
        </div>
      </main>

      {/* Responsive + hover overrides */}
      <style>{`
        .zl-radio-hamburger { display: none; }
        button:hover .qitem-play { opacity: 1 !important; }

        @media (max-width: 900px) {
          .zl-radio-sidebar {
            transform: translateX(-100%) !important;
            transition: transform 0.28s ease;
          }
          .zl-radio-sidebar.is-open {
            transform: translateX(0) !important;
            z-index: 200;
          }
          .zl-radio-main { margin-left: 0 !important; padding-top: 60px; }
          .zl-radio-hamburger {
            display: flex !important;
            position: fixed; top: 16px; left: 16px; z-index: 100;
            flex-direction: column; gap: 5px;
            background: rgba(13,13,13,0.92); border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px; padding: 10px; cursor: pointer;
          }
          .zl-radio-hamburger span { display: block; width: 20px; height: 2px; background: #fff; border-radius: 2px; }
          .zl-radio-mix-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .zl-radio-mood-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 560px) {
          .zl-radio-mix-grid { grid-template-columns: 1fr !important; }
          .zl-radio-mood-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}
