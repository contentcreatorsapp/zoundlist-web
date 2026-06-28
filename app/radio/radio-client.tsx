"use client";

import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import type { Catalog, Track, CoverVariant } from "@/types/catalog";
import { Brand } from "@/components/brand";
import { usePlayer } from "@/lib/player/context";
import { loadPlayer } from "@/lib/player/storage";
import type { PlayerTrack } from "@/lib/player/types";
import { EDITORIAL_PLAYLISTS, ORIGINALS_CONFIG } from "@/lib/radio/playlists";
import type { EditorialPlaylist } from "@/lib/radio/types";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

// ── Cinematic gradients — feel like tinted photography, not blob mesh ─────────
const CINEMA: Record<CoverVariant, string> = {
  violet:  "linear-gradient(155deg, #08001a 0%, #22066b 45%, #0f0230 100%)",
  lime:    "linear-gradient(155deg, #041100 0%, #143600 45%, #081b00 100%)",
  orange:  "linear-gradient(155deg, #190400 0%, #5c1800 45%, #2e0900 100%)",
  magenta: "linear-gradient(155deg, #170011 0%, #5c0044 45%, #2d0021 100%)",
  teal:    "linear-gradient(155deg, #001212 0%, #004240 45%, #001c1c 100%)",
  gold:    "linear-gradient(155deg, #130d00 0%, #4c3400 45%, #241a00 100%)",
  ice:     "linear-gradient(155deg, #000c18 0%, #002852 45%, #001230 100%)",
  ember:   "linear-gradient(155deg, #190300 0%, #5c1100 45%, #2e0700 100%)",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getGreetingParts(): [string, string] {
  const h = new Date().getHours();
  if (h < 12) return ["Buenos ", "días"];
  if (h < 18) return ["Buenas ", "tardes"];
  return ["Buenas ", "noches"];
}

function toPlayerTrack(t: Track): PlayerTrack | null {
  if (!t.audioUrl) return null;
  return { id: t.id, title: t.title, artist: t.artist, audioUrl: t.audioUrl, cover: t.cover, coverImage: t.coverImage ?? null, duration: t.duration, albumId: null };
}

function tracksForStation(tracks: Track[], pl: EditorialPlaylist): Track[] {
  return tracks.filter(t => pl.genreSlugs.includes(t.genre) || pl.moodKeywords.some(k => t.mood.toLowerCase().includes(k.toLowerCase())));
}

function stationCoverSrc(tracks: Track[], pl: EditorialPlaylist): string | null {
  return tracksForStation(tracks, pl).find(t => !!t.coverImage)?.coverImage ?? null;
}

const VARIANTS: CoverVariant[] = ["violet", "lime", "orange", "magenta", "teal", "gold", "ice", "ember"];
function getArtists(tracks: Track[]): { name: string; trackCount: number; variant: CoverVariant }[] {
  const cm = new Map<string, number>();
  const vm = new Map<string, CoverVariant>();
  let i = 0;
  for (const t of tracks) {
    cm.set(t.artist, (cm.get(t.artist) ?? 0) + 1);
    if (!vm.has(t.artist)) { vm.set(t.artist, VARIANTS[i % VARIANTS.length]); i++; }
  }
  return [...cm.entries()].map(([name, trackCount]) => ({ name, trackCount, variant: vm.get(name)! }))
    .sort((a, b) => b.trackCount - a.trackCount).slice(0, 10);
}

const LIKED_KEY = "zl_liked_tracks";
function getLiked(): Set<string> { try { return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) ?? "[]")); } catch { return new Set(); } }
function mutateLiked(id: string): boolean { const s = getLiked(); s.has(id) ? s.delete(id) : s.add(id); localStorage.setItem(LIKED_KEY, JSON.stringify([...s])); return s.has(id); }

const MOOD_FILTERS = [
  { label: "Para ti",       keywords: [] as string[] },
  { label: "Concentración", keywords: ["concentrado", "focus"] },
  { label: "Relajación",    keywords: ["tranquilo", "relajado"] },
  { label: "Energía",       keywords: ["energético", "energetico", "motivacional"] },
  { label: "Melancolía",    keywords: ["melancólico", "melancolico"] },
  { label: "Inspiración",   keywords: ["épico", "epico"] },
];
function filterPlaylists(pls: EditorialPlaylist[], f: typeof MOOD_FILTERS[0]) {
  if (!f.keywords.length) return pls;
  return pls.filter(pl => pl.moodKeywords.some(k => f.keywords.some(fk => k.toLowerCase().includes(fk))));
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const PlayI   = ({ s = 18 }: { s?: number }) => <svg viewBox="0 0 24 24" width={s} height={s} fill="currentColor"><path d="M8 5v14l11-7z"/></svg>;
const PauseI  = ({ s = 18 }: { s?: number }) => <svg viewBox="0 0 24 24" width={s} height={s} fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>;
const HeartI  = ({ on }: { on: boolean }) => <svg viewBox="0 0 24 24" width={16} height={16} fill={on ? "var(--brand)" : "none"} stroke={on ? "var(--brand)" : "rgba(255,255,255,0.5)"} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
const HomeI   = () => <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>;
const SearchI = () => <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const LibI    = () => <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z"/></svg>;
const FavI    = () => <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
const RecentI = () => <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M13 3a9 9 0 1 0 9 9h-2a7 7 0 1 1-7-7V3zm-1 5v5l4 2.5.7-1.2L13 12V8h-1z"/></svg>;
const WaveI   = () => <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm9-2.17v10.34c1.86-.95 3-2.85 3-5.17s-1.14-4.22-3-5.17z"/></svg>;
const TrendI  = () => <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>;
const NewI    = () => <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>;

// ── PhotoCard (full-bleed base) ───────────────────────────────────────────────
function PhotoCard({ src, gradient, radius = 10, style, children, onClick }: {
  src: string | null; gradient: string; radius?: number;
  style?: React.CSSProperties; children?: React.ReactNode; onClick?: () => void;
}) {
  return (
    <div onClick={onClick} style={{ position: "relative", overflow: "hidden", borderRadius: radius, cursor: onClick ? "pointer" : "default", ...style }}>
      {src
        ? <img src={src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        : <div style={{ position: "absolute", inset: 0, background: gradient }} />
      }
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.5) 35%, rgba(0,0,0,0.15) 70%, rgba(0,0,0,0.05) 100%)" }} />
      <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
}

// ── Sidebar helpers ───────────────────────────────────────────────────────────
function SbSection({ label }: { label: string }) {
  return <p style={{ fontSize: "0.63rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.28)", padding: "14px 10px 4px" }}>{label}</p>;
}
function SbItem({ icon, label, active, href, indent, onClick }: { icon?: React.ReactNode; label: string; active?: boolean; href: string; indent?: boolean; onClick?: () => void }) {
  return (
    <a href={href} onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, padding: indent ? "7px 10px 7px 20px" : "8px 10px", borderRadius: 6, textDecoration: "none", color: active ? "#fff" : "rgba(255,255,255,0.52)", fontSize: "0.86rem", fontWeight: active ? 700 : 500, background: active ? "rgba(255,255,255,0.09)" : "transparent" }}>
      {icon && <span style={{ flexShrink: 0, opacity: active ? 1 : 0.65 }}>{icon}</span>}
      <span>{label}</span>
    </a>
  );
}

// ── Section heading ─────────────────────────────────────────────────────────────
function SecHead({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <h2 style={{ fontSize: "1.35rem", fontWeight: 700, letterSpacing: "-0.02em", color: "#fff", marginBottom: subtitle ? 4 : 0 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.42)" }}>{subtitle}</p>}
    </div>
  );
}

// ── NOW PLAYING hero card ─────────────────────────────────────────────────────
function NowPlayingCard({ track, isPlaying, onToggle }: { track: Track; isPlaying: boolean; onToggle: () => void }) {
  return (
    <PhotoCard src={track.coverImage} gradient={CINEMA[track.cover]} style={{ height: "100%", borderRadius: 14 }}>
      <div style={{ flex: 1 }} />
      <div style={{ padding: "24px 24px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span className="rp-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--brand)", display: "block", flexShrink: 0 }} />
          <span style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(255,255,255,0.72)" }}>En Radio Ahora</span>
        </div>
        <h2 style={{ fontSize: "clamp(1.4rem, 2.5vw, 1.9rem)", fontWeight: 700, letterSpacing: "-0.025em", color: "#fff", marginBottom: 6, lineHeight: 1.15 }}>{track.title}</h2>
        <p style={{ fontSize: "0.84rem", color: "rgba(255,255,255,0.52)", marginBottom: 24 }}>{track.artist} · {track.mood}</p>
        <button onClick={onToggle} style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--brand)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand-ink)", boxShadow: "0 8px 32px rgba(149,249,8,0.4)" }}>
          {isPlaying ? <PauseI s={22} /> : <PlayI s={22} />}
        </button>
      </div>
    </PhotoCard>
  );
}

// ── Section shortcut card ─────────────────────────────────────────────────────
function ShortcutCard({ title, subtitle, src, variant, href }: { title: string; subtitle: string; src: string | null; variant: CoverVariant; href: string }) {
  const [hov, setHov] = useState(false);
  return (
    <a href={href} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: "block", textDecoration: "none", height: "100%", transform: hov ? "scale(1.02)" : "scale(1)", transition: "transform 0.18s ease" }}>
      <PhotoCard src={src} gradient={CINEMA[variant]} style={{ height: "100%", borderRadius: 10 }}>
        <div style={{ flex: 1 }} />
        <div style={{ padding: "10px 14px 14px" }}>
          <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "#fff", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
          <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.48)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle}</div>
        </div>
      </PhotoCard>
    </a>
  );
}

// ── Continue listening card (landscape) ───────────────────────────────────────
function ContinueCard({ track, active, playing, onPlay }: { track: Track; active: boolean; playing: boolean; onPlay: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onPlay} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ flexShrink: 0, width: 270, border: "none", background: "transparent", cursor: "pointer", padding: 0 }}>
      <PhotoCard src={track.coverImage} gradient={CINEMA[track.cover]} style={{ width: 270, height: 160, borderRadius: 10 }}>
        {active && (
          <div style={{ padding: "10px 12px 0", display: "flex", alignItems: "center", gap: 6 }}>
            <span className="rp-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--brand)", display: "block" }} />
            <span style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--brand)" }}>Reproduciendo</span>
          </div>
        )}
        <div style={{ flex: 1 }} />
        <div style={{ padding: "0 12px 12px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", gap: 5, marginBottom: 6 }}>
              <span style={{ fontSize: "0.57rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.14)", borderRadius: 3, padding: "2px 6px" }}>{track.genre}</span>
              <span style={{ fontSize: "0.57rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.14)", borderRadius: 3, padding: "2px 6px" }}>{track.mood}</span>
            </div>
            <div style={{ fontSize: "0.87rem", fontWeight: 700, color: active ? "var(--brand)" : "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 188 }}>{track.title}</div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--brand)", color: "var(--brand-ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: hov || active ? 1 : 0, transform: hov || active ? "translateY(0)" : "translateY(6px)", transition: "all 0.2s" }}>
            {active && playing ? <PauseI s={14} /> : <PlayI s={14} />}
          </div>
        </div>
      </PhotoCard>
    </button>
  );
}

// ── Station card (Mix del día) ─────────────────────────────────────────────────
function StationCard({ playlist, coverSrc, trackCount, active, playing, onPlay }: {
  playlist: EditorialPlaylist; coverSrc: string | null; trackCount: number; active: boolean; playing: boolean; onPlay: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onPlay} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ flexShrink: 0, width: 200, border: "none", background: "transparent", cursor: "pointer", padding: 0, textAlign: "left" }}>
      <PhotoCard src={coverSrc} gradient={CINEMA[playlist.coverVariant]} style={{ width: 200, height: 200, borderRadius: 12 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 12px 0 0" }}>
          <div style={{ width: 42, height: 42, borderRadius: "50%", background: "var(--brand)", color: "var(--brand-ink)", display: "flex", alignItems: "center", justifyContent: "center", opacity: hov || active ? 1 : 0, transform: hov || active ? "translateY(0) scale(1)" : "translateY(6px) scale(0.85)", transition: "all 0.2s", boxShadow: "0 8px 24px rgba(149,249,8,0.4)" }}>
            {active && playing ? <PauseI s={18} /> : <PlayI s={18} />}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ padding: "0 14px 14px" }}>
          <div style={{ fontSize: "0.92rem", fontWeight: 700, color: active ? "var(--brand)" : "#fff", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{playlist.title}</div>
          <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.48)", lineHeight: 1.4, overflow: "hidden", maxHeight: "2.8em" }}>{playlist.description}</div>
          {trackCount > 0 && <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.28)", marginTop: 5 }}>{trackCount} tracks</div>}
        </div>
      </PhotoCard>
    </button>
  );
}

// ── Trending card (numbered) ──────────────────────────────────────────────────
function TrendCard({ track, rank, active, playing, onPlay }: { track: Track; rank: number; active: boolean; playing: boolean; onPlay: () => void }) {
  const [hov, setHov] = useState(false);
  const [liked, setLiked] = useState(false);
  useEffect(() => { setLiked(getLiked().has(track.id)); }, [track.id]);
  const handleLike = (e: React.MouseEvent) => { e.stopPropagation(); setLiked(mutateLiked(track.id)); };
  return (
    <button onClick={onPlay} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ flexShrink: 0, width: 185, border: "none", background: "transparent", cursor: "pointer", padding: 0, textAlign: "left" }}>
      <div style={{ position: "relative", width: 185, height: 185, borderRadius: 10, overflow: "hidden", marginBottom: 11 }}>
        {track.coverImage
          ? <img src={track.coverImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", transform: hov ? "scale(1.06)" : "scale(1)", transition: "transform 0.35s" }} />
          : <div style={{ width: "100%", height: "100%", background: CINEMA[track.cover], transform: hov ? "scale(1.06)" : "scale(1)", transition: "transform 0.35s" }} />
        }
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.84) 0%, rgba(0,0,0,0.05) 60%)" }} />
        <span style={{ position: "absolute", left: 12, bottom: 10, fontSize: "2.2rem", fontWeight: 900, color: "rgba(255,255,255,0.9)", lineHeight: 1, textShadow: "0 2px 16px rgba(0,0,0,0.9)" }}>{rank}</span>
        <button onClick={handleLike} style={{ position: "absolute", right: 8, top: 8, background: "none", border: "none", cursor: "pointer", padding: 6, opacity: hov || liked ? 1 : 0, transition: "opacity 0.18s" }}><HeartI on={liked} /></button>
        <div style={{ position: "absolute", right: 10, bottom: 10, width: 36, height: 36, borderRadius: "50%", background: "var(--brand)", color: "var(--brand-ink)", display: "flex", alignItems: "center", justifyContent: "center", opacity: hov || active ? 1 : 0, transform: hov || active ? "scale(1)" : "scale(0.8)", transition: "all 0.18s" }}>
          {active && playing ? <PauseI s={14} /> : <PlayI s={14} />}
        </div>
      </div>
      <div style={{ fontSize: "0.87rem", fontWeight: 700, color: active ? "var(--brand)" : "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.title}</div>
      <div style={{ fontSize: "0.73rem", color: "rgba(255,255,255,0.44)", marginTop: 3 }}>{track.artist}</div>
    </button>
  );
}

// ── New track card ─────────────────────────────────────────────────────────────
function NewCard({ track, active, playing, onPlay }: { track: Track; active: boolean; playing: boolean; onPlay: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onPlay} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ flexShrink: 0, width: 175, border: "none", background: "transparent", cursor: "pointer", padding: 0, textAlign: "left" }}>
      <div style={{ position: "relative", width: 175, height: 175, borderRadius: 10, overflow: "hidden", marginBottom: 10 }}>
        {track.coverImage
          ? <img src={track.coverImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", transform: hov ? "scale(1.06)" : "scale(1)", transition: "transform 0.35s" }} />
          : <div style={{ width: "100%", height: "100%", background: CINEMA[track.cover], transform: hov ? "scale(1.06)" : "scale(1)", transition: "transform 0.35s" }} />
        }
        <span style={{ position: "absolute", top: 9, left: 9, fontSize: "0.57rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", background: "var(--brand)", color: "var(--brand-ink)", borderRadius: 4, padding: "3px 8px" }}>Nuevo</span>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: hov || active ? 1 : 0, transition: "opacity 0.18s" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--brand)", color: "var(--brand-ink)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(149,249,8,0.4)" }}>
            {active && playing ? <PauseI s={18} /> : <PlayI s={18} />}
          </div>
        </div>
      </div>
      <div style={{ fontSize: "0.86rem", fontWeight: 700, color: active ? "var(--brand)" : "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.title}</div>
      <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.44)", marginTop: 3 }}>{track.artist}</div>
    </button>
  );
}

// ── Mood tile ──────────────────────────────────────────────────────────────────
function MoodTile({ mood, onPlay, hasContent }: { mood: { slug: string; name: string; cover: CoverVariant; trackCount: number }; onPlay: () => void; hasContent: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onPlay} disabled={!hasContent} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ border: "none", background: "transparent", cursor: hasContent ? "pointer" : "default", padding: 0, width: "100%", opacity: hasContent ? 1 : 0.38 }}>
      <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", height: 100, background: CINEMA[mood.cover], transform: hov && hasContent ? "scale(1.02)" : "scale(1)", transition: "transform 0.2s" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.35) 100%)" }} />
        <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 22px" }}>
          <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>{mood.name}</span>
          <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.48)", marginTop: 4 }}>{mood.trackCount} tracks</span>
        </div>
      </div>
    </button>
  );
}

// ── Artist circle ──────────────────────────────────────────────────────────────
function ArtistCircle({ name, trackCount, variant, onPlay }: { name: string; trackCount: number; variant: CoverVariant; onPlay: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onPlay} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ flexShrink: 0, width: 145, border: "none", background: "transparent", cursor: "pointer", padding: 0, transform: hov ? "scale(1.04)" : "scale(1)", transition: "transform 0.2s" }}>
      <div style={{ width: 145, height: 145, borderRadius: "50%", background: CINEMA[variant], overflow: "hidden", position: "relative", marginBottom: 11, boxShadow: "0 8px 32px rgba(0,0,0,0.55)" }}>
        <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.6rem", opacity: 0.28, color: "#fff" }}>♪</span>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 60%)" }} />
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
        <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.44)", marginTop: 3 }}>{trackCount} {trackCount === 1 ? "track" : "tracks"}</div>
      </div>
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function RadioClient({ catalog }: { catalog: Catalog }) {
  const { tracks, moods } = catalog;
  const player    = usePlayer();
  const playingId = player.track?.id ?? null;
  const allPT     = tracks.map(toPlayerTrack).filter((t): t is PlayerTrack => t !== null);

  const [user,        setUser]   = useState<User | null>(null);
  const [recent,      setRecent] = useState<Track[]>([]);
  const [greetPrefix, setGP]    = useState("");
  const [greetAccent, setGA]    = useState("");
  const [menuOpen,    setMenu]  = useState(false);
  const [moodFilter,  setFilter]= useState(MOOD_FILTERS[0]);

  const heroTrack = player.track
    ? (tracks.find(t => t.id === player.track!.id) ?? tracks.find(t => t.staffHero) ?? tracks.find(t => t.featured) ?? tracks[0])
    : (tracks.find(t => t.staffHero) ?? tracks.find(t => t.featured) ?? tracks[0]);

  const trending         = tracks.filter(t => t.trending);
  const newTracks        = tracks.filter(t => t.isNew);
  const artists          = getArtists(tracks);
  const visiblePlaylists = filterPlaylists(EDITORIAL_PLAYLISTS, moodFilter);

  const shortcutBgs = {
    mix:   stationCoverSrc(tracks, EDITORIAL_PLAYLISTS[0]),
    trend: trending.find(t => !!t.coverImage)?.coverImage ?? null,
    fresh: newTracks.find(t => !!t.coverImage)?.coverImage ?? null,
    disc:  [...tracks].reverse().find(t => !!t.coverImage)?.coverImage ?? null,
  };

  useEffect(() => { const [p, a] = getGreetingParts(); setGP(p); setGA(a); }, []);

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
      setRecent(tracks.filter(t => ids.has(t.id)).slice(0, 8));
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

  const isStationActive = (pl: EditorialPlaylist) => !!playingId && tracksForStation(tracks, pl).some(t => t.id === playingId);

  const playMood = (moodName: string) => {
    const q = tracks.filter(t => t.mood.toLowerCase().includes(moodName.toLowerCase().split(" ")[0]) && !!t.audioUrl).map(toPlayerTrack).filter((x): x is PlayerTrack => x !== null);
    if (q.length) player.playTrack(q[0], q);
  };

  const SB_W = 240;
  const PAD  = 48;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0D0D0D" }}>

      {/* ── SIDEBAR ──────────────────────────────────────────────────────────── */}
      <aside className={`zl-radio-sidebar${menuOpen ? " is-open" : ""}`}
        style={{ width: SB_W, flexShrink: 0, position: "fixed", left: 0, top: 0, bottom: 80, background: "#0f0f0f", borderRight: "1px solid rgba(255,255,255,0.08)", overflowY: "auto", zIndex: 50, display: "flex", flexDirection: "column", padding: "20px 8px 16px" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 6px 20px" }}>
          <Brand height={20} />
          <span style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--brand)", background: "rgba(149,249,8,0.1)", border: "1px solid rgba(149,249,8,0.28)", borderRadius: 4, padding: "2px 7px" }}>Radio</span>
        </div>

        <SbItem icon={<HomeI />}   label="Inicio"        active href="/radio" onClick={() => setMenu(false)} />
        <SbItem icon={<SearchI />} label="Buscar"               href="#" />
        <SbItem icon={<LibI />}    label="Tu biblioteca"         href="#" />

        <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "8px 4px" }} />
        <SbItem icon={<FavI />}    label="Favoritos"             href="#" />
        <SbItem icon={<RecentI />} label="Escuchado"             href="#" />

        <SbSection label="Explora" />
        <SbItem icon={<WaveI />}  label="Estaciones"     href="#stations" indent onClick={() => setMenu(false)} />
        <SbItem icon={<TrendI />} label="Top en Radio"   href="#trending" indent onClick={() => setMenu(false)} />
        <SbItem icon={<NewI />}   label="Nuevos sonidos" href="#new"      indent onClick={() => setMenu(false)} />

        <SbSection label="Estados de ánimo" />
        {moods.slice(0, 6).map(m => (
          <SbItem key={m.slug} label={m.name} href="#moods" indent onClick={() => { playMood(m.name); setMenu(false); }} />
        ))}

        {recent.length > 0 && (
          <>
            <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "10px 4px" }} />
            <SbSection label="Recientes" />
            {recent.slice(0, 5).map(t => (
              <button key={t.id} onClick={() => { toggle(t); setMenu(false); }}
                style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 8px", borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", width: "100%" }}>
                <div style={{ width: 32, height: 32, borderRadius: 4, overflow: "hidden", flexShrink: 0 }}>
                  {t.coverImage
                    ? <img src={t.coverImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <div style={{ width: "100%", height: "100%", background: CINEMA[t.cover] }} />
                  }
                </div>
                <div style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
                  <div style={{ fontSize: "0.76rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: playingId === t.id ? "var(--brand)" : "#fff" }}>{t.title}</div>
                  <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.36)" }}>{t.artist}</div>
                </div>
              </button>
            ))}
          </>
        )}

        <div style={{ marginTop: "auto" }}>
          <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "12px 4px" }} />
          <div style={{ background: "rgba(149,249,8,0.05)", border: "1px solid rgba(149,249,8,0.18)", borderRadius: 10, padding: "14px 12px", margin: "0 0 10px" }}>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#fff", marginBottom: 3 }}>¿Buscas música para tus proyectos?</p>
            <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.48)", marginBottom: 12, lineHeight: 1.45 }}>Explora el catálogo completo en Zoundlist.</p>
            <a href="/" style={{ display: "block", textAlign: "center", padding: "8px 0", background: "var(--brand)", color: "var(--brand-ink)", borderRadius: 6, textDecoration: "none", fontSize: "0.76rem", fontWeight: 700 }}>Explorar catálogo</a>
          </div>
          {user && <SbItem label="Mi panel" href="/dashboard" />}
        </div>
      </aside>

      {/* Mobile hamburger */}
      <button onClick={() => setMenu(v => !v)} aria-label="Menú" className="zl-radio-hamburger" style={{ display: "none" }}>
        <span /><span /><span />
      </button>
      {menuOpen && <div onClick={() => setMenu(false)} aria-hidden="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 48, backdropFilter: "blur(4px)" }} />}

      {/* ── MAIN ─────────────────────────────────────────────────────────────── */}
      <main className="zl-radio-main" style={{ flex: 1, marginLeft: SB_W, paddingBottom: 100, overflowX: "hidden", minWidth: 0 }}>

        {/* HERO ─────────────────────────────────────────────────────────────── */}
        <section style={{ padding: `48px ${PAD}px 44px` }}>
          <h1 style={{ fontSize: "clamp(2.2rem, 4vw, 3.2rem)", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1.05, marginBottom: 8 }}>
            <span style={{ color: "#fff" }}>{greetPrefix}</span>
            <span style={{ color: "var(--brand)" }}>{greetAccent || "–"}</span>
          </h1>
          <p style={{ fontSize: "0.94rem", color: "rgba(255,255,255,0.42)", marginBottom: 28 }}>Dale play y déjate llevar.</p>

          {/* Mood filter pills */}
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none", marginBottom: 28 }}>
            {MOOD_FILTERS.map(f => (
              <button key={f.label} onClick={() => setFilter(f)}
                style={{ flexShrink: 0, padding: "8px 18px", borderRadius: 20, border: moodFilter.label === f.label ? "none" : "1px solid rgba(255,255,255,0.12)", background: moodFilter.label === f.label ? "var(--brand)" : "rgba(255,255,255,0.06)", color: moodFilter.label === f.label ? "var(--brand-ink)" : "#fff", fontSize: "0.84rem", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Hero grid: NOW PLAYING + 4 shortcuts */}
          {heroTrack && (
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 12, height: 340 }} className="zl-radio-hero-grid">
              <NowPlayingCard track={heroTrack} isPlaying={player.isPlaying && playingId === heroTrack.id} onToggle={() => toggle(heroTrack)} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 10 }}>
                <ShortcutCard title="Mix del día" subtitle="Hecho para ti" src={shortcutBgs.mix} variant="lime" href="#stations" />
                <ShortcutCard title="Lo que está sonando" subtitle="Top 50" src={shortcutBgs.trend} variant="violet" href="#trending" />
                <ShortcutCard title="Nuevos sonidos" subtitle="Estrenos de la semana" src={shortcutBgs.fresh} variant="teal" href="#new" />
                <ShortcutCard title="Descubrimientos" subtitle="Artistas que quizás no conoces" src={shortcutBgs.disc} variant="gold" href="#artists" />
              </div>
            </div>
          )}
        </section>

        {/* Sigue escuchando */}
        {recent.length > 0 && (
          <section style={{ padding: `0 ${PAD}px 48px` }}>
            <SecHead title="Sigue escuchando" />
            <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
              {recent.map(t => <ContinueCard key={t.id} track={t} active={playingId === t.id} playing={player.isPlaying} onPlay={() => toggle(t, recent)} />)}
            </div>
          </section>
        )}

        {/* Mix del día */}
        <section id="stations" style={{ padding: `0 ${PAD}px 48px` }}>
          <SecHead title="Mix del día para ti" subtitle={greetAccent ? `Hecho para tu ${greetAccent}` : "Curado para este momento"} />
          <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
            {visiblePlaylists.map(pl => (
              <StationCard key={pl.id} playlist={pl} coverSrc={stationCoverSrc(tracks, pl)} trackCount={tracksForStation(tracks, pl).length} active={isStationActive(pl)} playing={player.isPlaying} onPlay={() => playStation(pl)} />
            ))}
          </div>
        </section>

        {/* Lo que está sonando */}
        {trending.length > 0 && (
          <section id="trending" style={{ padding: `0 ${PAD}px 48px` }}>
            <SecHead title="Lo que está sonando" subtitle="Las más escuchadas en Radio" />
            <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
              {trending.slice(0, 10).map((t, i) => <TrendCard key={t.id} track={t} rank={i + 1} active={playingId === t.id} playing={player.isPlaying} onPlay={() => toggle(t, trending)} />)}
            </div>
          </section>
        )}

        {/* Nuevos sonidos */}
        {newTracks.length > 0 && (
          <section id="new" style={{ padding: `0 ${PAD}px 48px` }}>
            <SecHead title="Nuevos sonidos" subtitle="Estrenos de esta semana" />
            <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
              {newTracks.map(t => <NewCard key={t.id} track={t} active={playingId === t.id} playing={player.isPlaying} onPlay={() => toggle(t, newTracks)} />)}
            </div>
          </section>
        )}

        {/* ¿Qué quieres sentir? */}
        {moods.length > 0 && (
          <section id="moods" style={{ padding: `0 ${PAD}px 48px` }}>
            <SecHead title="¿Qué quieres sentir?" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }} className="zl-radio-mood-grid">
              {moods.map(m => {
                const has = tracks.some(t => t.mood.toLowerCase().includes(m.name.toLowerCase().split(" ")[0]) && !!t.audioUrl);
                return <MoodTile key={m.slug} mood={m} onPlay={() => playMood(m.name)} hasContent={has} />;
              })}
            </div>
          </section>
        )}

        {/* Artistas */}
        {artists.length > 0 && (
          <section id="artists" style={{ padding: `0 ${PAD}px 48px` }}>
            <SecHead title="Artistas que debes escuchar" />
            <div style={{ display: "flex", gap: 22, overflowX: "auto", paddingBottom: 12, scrollbarWidth: "none" }}>
              {artists.map(a => (
                <ArtistCircle key={a.name} name={a.name} trackCount={a.trackCount} variant={a.variant}
                  onPlay={() => { const q = tracks.filter(t => t.artist === a.name).map(toPlayerTrack).filter((x): x is PlayerTrack => x !== null); if (q.length) player.playTrack(q[0], q); }} />
              ))}
            </div>
          </section>
        )}

        {ORIGINALS_CONFIG.enabled && (
          <section style={{ padding: `0 ${PAD}px 48px` }}>
            <div className="zl-originals">
              <div className="zl-originals__label">✦ {ORIGINALS_CONFIG.labelName}</div>
              <h2 className="zl-h2" style={{ marginTop: 16, marginBottom: 14 }}>{ORIGINALS_CONFIG.tagline}</h2>
              <p style={{ color: "rgba(255,255,255,0.65)", maxWidth: 480, fontSize: "0.95rem", lineHeight: 1.65 }}>{ORIGINALS_CONFIG.comingSoonText}</p>
            </div>
          </section>
        )}

        <div style={{ padding: `22px ${PAD}px`, display: "flex", gap: 22, alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <p style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.24)" }}>© 2026 Zoundlist · JM Creativos LLC</p>
          <a href="/privacidad" style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.24)", textDecoration: "none" }}>Privacidad</a>
        </div>
      </main>

      <style>{`
        .zl-radio-hamburger { display: none; }
        @keyframes rp-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.45;transform:scale(.8)} }
        .rp-dot { animation: rp-pulse 2s ease-in-out infinite; }

        @media (max-width: 1024px) {
          .zl-radio-hero-grid { grid-template-columns: 1fr !important; height: auto !important; }
          .zl-radio-hero-grid > div:last-child { height: 180px; }
        }
        @media (max-width: 900px) {
          .zl-radio-sidebar { transform: translateX(-100%) !important; transition: transform .28s cubic-bezier(.22,1,.36,1); }
          .zl-radio-sidebar.is-open { transform: translateX(0) !important; z-index: 200; }
          .zl-radio-main { margin-left: 0 !important; padding-top: 60px; }
          .zl-radio-hamburger { display: flex !important; flex-direction: column; gap: 5px; position: fixed; top: 16px; left: 16px; z-index: 100; background: rgba(15,15,15,.96); border: 1px solid rgba(255,255,255,.1); border-radius: 8px; padding: 10px; cursor: pointer; }
          .zl-radio-hamburger span { display: block; width: 20px; height: 2px; background: #fff; border-radius: 2px; }
          .zl-radio-mood-grid { grid-template-columns: repeat(2,1fr) !important; }
        }
        @media (max-width: 600px) {
          .zl-radio-mood-grid { grid-template-columns: 1fr !important; }
          .zl-radio-hero-grid > div:last-child { height: 140px; }
        }
      `}</style>
    </div>
  );
}
