"use client";

import { useCallback } from "react";
import { usePlayer } from "@/lib/player/context";
import type { PlayerTrack } from "@/lib/player/types";
import { COVERS } from "@/lib/catalog/covers";
import type { Album, AlbumTrack } from "@/services/albums";

// ── Icons ─────────────────────────────────────────────────────────────────────
function Play({ size = 16 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor"><path d="M8 5v14l11-7z" /></svg>;
}
function Pause({ size = 16 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>;
}

interface Props {
  album: Album;
  tracks: AlbumTrack[];
}

export function AlbumClient({ album, tracks }: Props) {
  const player = usePlayer();

  const albumArtist = album.artist ?? "Artista";

  // Build PlayerTrack list — only tracks with real audio
  const playerTracks: PlayerTrack[] = tracks
    .filter(t => !!t.audioUrl)
    .map(t => ({
      id: t.id,
      title: t.title,
      artist: t.artist || albumArtist,
      audioUrl: t.audioUrl!,
      cover: t.cover,
      coverImage: t.coverImage ?? null,
      duration: t.duration,
      albumId: album.id,
    }));

  const playingId = player.track?.id;

  const handleTrack = useCallback((track: AlbumTrack) => {
    if (!track.audioUrl) return;
    const pt = playerTracks.find(p => p.id === track.id);
    if (!pt) return;
    if (playingId === track.id) {
      player.togglePlay();
    } else {
      player.playTrack(pt, playerTracks);
    }
  }, [player, playerTracks, playingId]);

  const handlePlayAlbum = useCallback(() => {
    if (playerTracks.length > 0) player.playAlbum(playerTracks);
  }, [player, playerTracks]);

  const hasAudio = playerTracks.length > 0;

  return (
    <div>
      {/* Play album button */}
      {hasAudio && (
        <button
          onClick={handlePlayAlbum}
          className="zl-btn zl-btn--primary"
          style={{ marginBottom: 28, display: "flex", alignItems: "center", gap: 8 }}
        >
          <Play size={17} />
          Reproducir álbum
        </button>
      )}

      {/* Track list */}
      {tracks.length === 0 ? (
        <div className="zl-card" style={{ padding: "40px 32px", textAlign: "center" }}>
          <p className="zl-muted">Este álbum no tiene tracks aún.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tracks.map((track: AlbumTrack, i: number) => {
            const isPlaying = playingId === track.id && player.isPlaying;
            const isCurrent = playingId === track.id;
            const canPlay = !!track.audioUrl;

            return (
              <div
                key={track.id}
                className="zl-card"
                style={{
                  padding: "14px 18px",
                  display: "flex", alignItems: "center", gap: 16,
                  borderColor: isCurrent ? "rgba(149,249,8,0.25)" : undefined,
                  cursor: canPlay ? "pointer" : "default",
                  opacity: canPlay ? 1 : 0.45,
                }}
                onClick={() => handleTrack(track)}
                role={canPlay ? "button" : undefined}
                aria-label={canPlay ? `${isPlaying ? "Pausar" : "Reproducir"} ${track.title}` : undefined}
              >
                {/* Number / play indicator */}
                <span style={{
                  width: 24, textAlign: "center", fontSize: "0.8rem",
                  color: isCurrent ? "var(--brand)" : "var(--text-3)",
                  flexShrink: 0,
                }}>
                  {isCurrent
                    ? (isPlaying ? <Pause size={14} /> : <Play size={14} />)
                    : i + 1}
                </span>

                {/* Cover */}
                <div style={{
                  width: 52, height: 52, borderRadius: 10, flexShrink: 0, overflow: "hidden",
                  background: track.coverImage
                    ? `url(${track.coverImage}) center/cover no-repeat`
                    : COVERS[track.cover],
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem",
                  position: "relative",
                }}>
                  {!track.coverImage && track.glyph}
                  {/* Playing overlay */}
                  {isPlaying && (
                    <div style={{
                      position: "absolute", inset: 0,
                      background: "rgba(0,0,0,0.45)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Pause size={18} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontWeight: isCurrent ? 700 : 600, fontSize: "0.95rem", margin: 0,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    color: isCurrent ? "var(--brand)" : "var(--text)",
                  }}>
                    {track.title}
                  </p>
                  <p style={{ fontSize: "0.76rem", color: "var(--text-3)", margin: "3px 0 0" }}>
                    {track.mood}{track.bpm ? ` · ${track.bpm} BPM` : ""}
                  </p>
                </div>

                {/* Duration + play button */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                  <span style={{ fontSize: "0.82rem", color: "var(--text-3)" }}>{track.duration}</span>
                  {canPlay && (
                    <button
                      onClick={e => { e.stopPropagation(); handleTrack(track); }}
                      style={{
                        width: 34, height: 34, borderRadius: "50%",
                        background: isCurrent ? "var(--brand)" : "rgba(255,255,255,0.1)",
                        border: "none", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: isCurrent ? "var(--brand-ink)" : "var(--text)",
                        flexShrink: 0, transition: "background 0.15s",
                      }}
                    >
                      {isPlaying ? <Pause /> : <Play />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
