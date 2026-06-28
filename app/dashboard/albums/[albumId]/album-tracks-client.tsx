"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { usePlayer } from "@/lib/player/context";
import type { PlayerTrack } from "@/lib/player/types";
import { COVERS } from "@/lib/catalog/covers";
import type { Album, AlbumTrack } from "@/services/albums";
import { PublishingAssistant } from "@/components/ai/PublishingAssistant";
import { createClient } from "@/lib/supabase/client";

function Play({ size = 14 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor"><path d="M8 5v14l11-7z" /></svg>;
}
function Pause({ size = 14 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>;
}

interface Props {
  album: Album;
  tracks: AlbumTrack[];
}

function BulkPublishBar({ tracks, albumId }: { tracks: AlbumTrack[]; albumId: string }) {
  const router   = useRouter();
  const drafts   = tracks.filter(t => !t.published);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  if (drafts.length === 0) return null;

  const publish = async () => {
    if (!confirm(`¿Publicar los ${drafts.length} tracks en borrador de este álbum?`)) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const ids = drafts.map(t => t.id);
    const { error: err } = await supabase
      .from("tracks")
      .update({ published: true, ai_status: "published" })
      .in("id", ids)
      .eq("album_id", albumId);
    setLoading(false);
    if (err) { setError(err.message); return; }
    router.refresh();
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, justifyContent: "flex-end",
      marginBottom: 14, flexWrap: "wrap",
    }}>
      {error && <span style={{ fontSize: "0.8rem", color: "var(--orange)", flex: 1 }}>{error}</span>}
      <span style={{ fontSize: "0.82rem", color: "var(--text-3)" }}>
        {drafts.length} en borrador
      </span>
      <button
        className="zl-btn zl-btn--primary zl-btn--sm"
        onClick={publish}
        disabled={loading}
        style={{ fontSize: "0.8rem" }}
      >
        {loading ? "Publicando…" : `Publicar todos (${drafts.length})`}
      </button>
    </div>
  );
}

export function AlbumTracksClient({ album, tracks }: Props) {
  const player = usePlayer();

  const albumArtist = album.artist ?? "Artista";

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
    playingId === track.id ? player.togglePlay() : player.playTrack(pt, playerTracks);
  }, [player, playerTracks, playingId]);

  if (tracks.length === 0) {
    return (
      <div className="zl-card" style={{ padding: "48px 32px", textAlign: "center" }}>
        <p style={{ fontSize: "2rem", marginBottom: 12 }}>🎵</p>
        <p className="zl-muted" style={{ marginBottom: 20 }}>
          Este álbum no tiene tracks aún. Usa "Añadir track" o sube un ZIP arriba.
        </p>
      </div>
    );
  }

  return (
    <div>
      <PublishingAssistant albumId={album.id} tracks={tracks} />
      <BulkPublishBar tracks={tracks} albumId={album.id} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {tracks.map((track, i) => {
        const isCurrent = playingId === track.id;
        const isPlaying = isCurrent && player.isPlaying;
        const canPlay   = !!track.audioUrl;

        return (
          <div key={track.id} className="zl-card" style={{
            padding: "14px 18px", display: "flex", alignItems: "center", gap: 16,
            borderColor: isCurrent ? "rgba(149,249,8,0.25)" : undefined,
          }}>
            {/* Number / play indicator */}
            <span style={{
              width: 24, textAlign: "center", fontSize: "0.8rem", flexShrink: 0,
              color: isCurrent ? "var(--brand)" : "var(--text-3)",
            }}>
              {isCurrent ? (isPlaying ? <Pause /> : <Play />) : i + 1}
            </span>

            {/* Cover */}
            <div style={{
              width: 52, height: 52, borderRadius: 10, flexShrink: 0, overflow: "hidden",
              background: track.coverImage
                ? `url(${track.coverImage}) center/cover no-repeat`
                : COVERS[track.cover],
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.3rem", position: "relative", cursor: canPlay ? "pointer" : "default",
            }} onClick={() => handleTrack(track)}>
              {!track.coverImage && track.glyph}
              {isPlaying && (
                <div style={{
                  position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Pause size={18} />
                </div>
              )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontWeight: 600, fontSize: "0.95rem", margin: 0,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                color: isCurrent ? "var(--brand)" : "var(--text)",
              }}>
                {track.title}
              </p>
              <p style={{ fontSize: "0.76rem", color: "var(--text-3)", margin: "3px 0 0" }}>
                {track.mood}{track.bpm ? ` · ${track.bpm} BPM` : ""}
              </p>
            </div>

            {/* Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
              <div style={{ textAlign: "center" }}>
                <p style={{
                  fontSize: "1rem", fontWeight: 700, margin: 0,
                  color: track.downloadCount > 0 ? "var(--brand)" : "var(--text-3)",
                }}>
                  {track.downloadCount}
                </p>
                <p style={{ fontSize: "0.68rem", color: "var(--text-3)", margin: 0 }}>descargas</p>
              </div>

              <span style={{ fontSize: "0.82rem", color: "var(--text-3)" }}>{track.duration}</span>

              <span className={track.published ? "zl-pill-new" : "zl-tag"} style={{ fontSize: "0.7rem" }}>
                {track.published ? "Publicado" : "Borrador"}
              </span>

              {/* Preview play button */}
              {canPlay && (
                <button
                  onClick={() => handleTrack(track)}
                  title={isPlaying ? "Pausar preview" : "Preview"}
                  style={{
                    width: 30, height: 30, borderRadius: "50%", border: "none",
                    background: isCurrent ? "var(--brand)" : "rgba(255,255,255,0.1)",
                    color: isCurrent ? "var(--brand-ink)" : "var(--text)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", flexShrink: 0, transition: "background 0.15s",
                  }}
                >
                  {isPlaying ? <Pause /> : <Play />}
                </button>
              )}

              <a
                href={`/dashboard/tracks/${track.id}`}
                className="zl-btn zl-btn--ghost zl-btn--sm"
                style={{ fontSize: "0.76rem", padding: "5px 12px" }}
              >
                Editar
              </a>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
