import { notFound } from "next/navigation";
import { getPublicAlbumWithTracks } from "@/services/albums";
import { COVERS } from "@/lib/catalog/covers";
import { Brand } from "@/components/brand";
import type { Metadata } from "next";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicAlbumWithTracks(slug);
  if (!result) return { title: "Álbum · Zoundlist" };
  return {
    title: `${result.album.title} · Zoundlist`,
    description: result.album.description ?? `${result.album.trackCount} tracks en Zoundlist.`,
    openGraph: { images: result.album.coverImage ? [{ url: result.album.coverImage }] : [] },
  };
}

export default async function PublicAlbumPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getPublicAlbumWithTracks(slug);
  if (!result) notFound();

  const { album, tracks, artistSlug } = result;

  return (
    <main style={{ minHeight: "100vh" }}>
      <header style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="zl-wrap" style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/"><Brand height={22} /></a>
          <a href={artistSlug ? `/artistas/${artistSlug}` : "/"} className="zl-btn zl-btn--ghost zl-btn--sm">
            ← {artistSlug ? "Ver artista" : "Explorar música"}
          </a>
        </div>
      </header>

      {/* Album hero */}
      <div style={{
        width: "100%", height: 240,
        background: album.coverImage
          ? `url(${album.coverImage}) center/cover no-repeat`
          : COVERS[album.cover],
        position: "relative",
      }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(13,13,13,0.3) 0%, rgba(13,13,13,0.85) 100%)" }} />
      </div>

      <div className="zl-wrap" style={{ marginTop: -56, position: "relative", zIndex: 2, paddingBottom: 80 }}>
        {/* Album info */}
        <div style={{ display: "flex", gap: 24, alignItems: "flex-end", marginBottom: 36, flexWrap: "wrap" }}>
          <div style={{
            width: 120, height: 120, borderRadius: 16, flexShrink: 0, overflow: "hidden",
            border: "4px solid var(--bg)",
            background: album.coverImage ? `url(${album.coverImage}) center/cover no-repeat` : COVERS[album.cover],
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem",
          }}>
            {!album.coverImage && album.glyph}
          </div>
          <div style={{ paddingBottom: 4 }}>
            <span className="zl-eyebrow" style={{ marginBottom: 6, display: "block" }}>Álbum</span>
            <h1 style={{ fontSize: "clamp(1.4rem, 4vw, 2.2rem)", fontWeight: 800, margin: "0 0 6px", lineHeight: 1.1 }}>{album.title}</h1>
            <p style={{ color: "var(--text-2)", fontSize: "0.9rem", margin: "0 0 6px" }}>
              {album.artist}
              {album.mood && <span style={{ color: "var(--text-3)" }}> · {album.mood}</span>}
            </p>
            <p style={{ color: "var(--text-3)", fontSize: "0.8rem", margin: 0 }}>
              {tracks.length} {tracks.length === 1 ? "track" : "tracks"}
            </p>
          </div>
        </div>

        {album.description && (
          <p style={{ fontSize: "0.95rem", color: "var(--text-2)", lineHeight: 1.7, maxWidth: 600, marginBottom: 36 }}>
            {album.description}
          </p>
        )}

        {/* Track list */}
        {tracks.length === 0 ? (
          <div className="zl-card" style={{ padding: "40px 32px", textAlign: "center" }}>
            <p className="zl-muted">Este álbum no tiene tracks aún.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {tracks.map((track, i) => (
              <div key={track.id} className="zl-card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ width: 24, textAlign: "center", fontSize: "0.8rem", color: "var(--text-3)", flexShrink: 0 }}>{i + 1}</span>

                <div style={{
                  width: 52, height: 52, borderRadius: 10, flexShrink: 0, overflow: "hidden",
                  background: track.coverImage ? `url(${track.coverImage}) center/cover no-repeat` : COVERS[track.cover],
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem",
                }}>
                  {!track.coverImage && track.glyph}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: "0.95rem", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.title}</p>
                  <p style={{ fontSize: "0.76rem", color: "var(--text-3)", margin: "3px 0 0" }}>
                    {track.mood}{track.bpm ? ` · ${track.bpm} BPM` : ""}
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                  <span style={{ fontSize: "0.82rem", color: "var(--text-3)" }}>{track.duration}</span>
                  <a href="/" className="zl-btn zl-btn--ghost zl-btn--sm">Escuchar →</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
