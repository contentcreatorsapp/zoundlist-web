import { redirect, notFound } from "next/navigation";
import { getMyProfile, canUpload } from "@/services/profile";
import { getAlbumWithTracks } from "@/services/albums";
import { COVERS } from "@/lib/catalog/covers";
import { Brand } from "@/components/brand";
import { ZipUpload } from "./zip-upload";

export const dynamic = "force-dynamic";

export default async function AlbumDetailPage({ params }: { params: Promise<{ albumId: string }> }) {
  const profile = await getMyProfile();
  if (!profile) redirect("/?auth=required");
  if (!canUpload(profile)) redirect("/dashboard");

  const { albumId } = await params;
  const result = await getAlbumWithTracks(albumId); // ownership-verified
  if (!result) notFound();

  const { album, tracks } = result;

  return (
    <main style={{ minHeight: "100vh" }}>
      <header style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="zl-wrap" style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Brand height={22} href="/dashboard" />
          <a href="/dashboard" className="zl-btn zl-btn--ghost zl-btn--sm">← Mis álbumes</a>
        </div>
      </header>

      <section className="zl-wrap" style={{ paddingTop: 40, paddingBottom: 80 }}>

        {/* Album header */}
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap" }}>
          <div style={{
            width: 120, height: 120, borderRadius: 16, flexShrink: 0, overflow: "hidden",
            background: album.coverImage ? `url(${album.coverImage}) center/cover no-repeat` : COVERS[album.cover],
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem",
          }}>
            {!album.coverImage && album.glyph}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <span className="zl-eyebrow" style={{ marginBottom: 6, display: "block" }}>Álbum</span>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "0 0 6px" }}>{album.title}</h1>
            <p style={{ color: "var(--text-2)", fontSize: "0.9rem", margin: "0 0 4px" }}>{album.artist}</p>
            {album.description && (
              <p style={{ color: "var(--text-3)", fontSize: "0.85rem", margin: "8px 0 0", maxWidth: 480 }}>
                {album.description}
              </p>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              <a href={`/dashboard/upload?album=${album.id}`} className="zl-btn zl-btn--primary zl-btn--sm">
                + Añadir track
              </a>
              <span className="zl-tag">{tracks.length} {tracks.length === 1 ? "track" : "tracks"}</span>
              <span className="zl-tag">{album.downloadCount} descargas</span>
            </div>
          </div>
        </div>

        {/* ZIP bulk upload */}
        <ZipUpload
          albumId={album.id}
          artistName={album.artist ?? ""}
          genreSlug={album.genreSlug ?? "cinematic"}
          mood={album.mood ?? "Épico"}
          cover={album.cover}
        />

        {/* Track list */}
        <div style={{ marginTop: 36 }}>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
            Tracks ({tracks.length})
          </p>

          {tracks.length === 0 ? (
            <div className="zl-card" style={{ padding: "48px 32px", textAlign: "center" }}>
              <p style={{ fontSize: "2rem", marginBottom: 12 }}>🎵</p>
              <p className="zl-muted" style={{ marginBottom: 20 }}>
                Este álbum no tiene tracks aún. Usa "Añadir track" o sube un ZIP arriba.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {tracks.map((track, i) => (
                <div key={track.id} className="zl-card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 16 }}>
                  <span style={{ width: 24, textAlign: "center", fontSize: "0.8rem", color: "var(--text-3)", flexShrink: 0 }}>
                    {i + 1}
                  </span>

                  <div style={{
                    width: 52, height: 52, borderRadius: 10, flexShrink: 0, overflow: "hidden",
                    background: track.coverImage ? `url(${track.coverImage}) center/cover no-repeat` : COVERS[track.cover],
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem",
                  }}>
                    {!track.coverImage && track.glyph}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: "0.95rem", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {track.title}
                    </p>
                    <p style={{ fontSize: "0.76rem", color: "var(--text-3)", margin: "3px 0 0" }}>
                      {track.mood}{track.bpm ? ` · ${track.bpm} BPM` : ""}
                    </p>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                    <div style={{ textAlign: "center" }}>
                      <p style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: track.downloadCount > 0 ? "var(--brand)" : "var(--text-3)" }}>
                        {track.downloadCount}
                      </p>
                      <p style={{ fontSize: "0.68rem", color: "var(--text-3)", margin: 0 }}>descargas</p>
                    </div>
                    <span style={{ fontSize: "0.82rem", color: "var(--text-3)" }}>{track.duration}</span>
                    <span className={track.published ? "zl-pill-new" : "zl-tag"} style={{ fontSize: "0.7rem" }}>
                      {track.published ? "Publicado" : "Borrador"}
                    </span>
                    <a
                      href={`/dashboard/tracks/${track.id}`}
                      className="zl-btn zl-btn--ghost zl-btn--sm"
                      style={{ fontSize: "0.76rem", padding: "5px 12px" }}
                    >
                      Editar
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
