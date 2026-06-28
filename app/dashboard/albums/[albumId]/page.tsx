import { redirect, notFound } from "next/navigation";
import { getMyProfile, canUpload } from "@/services/profile";
import { getAlbumWithTracks } from "@/services/albums";
import { Brand } from "@/components/brand";
import { ZipUpload } from "./zip-upload";
import { AlbumTracksClient } from "./album-tracks-client";
import { CoverPicker } from "@/components/covers/CoverPicker";

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
          <CoverPicker
            albumId={album.id}
            genreSlug={album.genreSlug ?? "cinematic"}
            coverImage={album.coverImage}
          />
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
          <AlbumTracksClient album={album} tracks={tracks} />
        </div>
      </section>
    </main>
  );
}
