import { redirect, notFound } from "next/navigation";
import { getMyProfile, canUpload } from "@/services/profile";
import { getMyTrackById } from "@/services/producer";
import { getCatalog } from "@/services/catalog";
import { Brand } from "@/components/brand";
import { TrackEditForm } from "./edit-form";

export const dynamic = "force-dynamic";

export default async function TrackEditPage({ params }: { params: Promise<{ trackId: string }> }) {
  const profile = await getMyProfile();
  if (!profile) redirect("/?auth=required");
  if (!canUpload(profile)) redirect("/dashboard");

  const { trackId } = await params;
  const [track, { genres, moods }] = await Promise.all([
    getMyTrackById(trackId),
    getCatalog(),
  ]);

  if (!track) notFound();

  const backHref = track.albumId ? `/dashboard/albums/${track.albumId}` : "/dashboard";

  return (
    <main style={{ minHeight: "100vh" }}>
      <header style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="zl-wrap" style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Brand height={22} href="/dashboard" />
          <a href={backHref} className="zl-btn zl-btn--ghost zl-btn--sm">← Volver al álbum</a>
        </div>
      </header>

      <section className="zl-wrap" style={{ paddingTop: 40, paddingBottom: 80, maxWidth: 800 }}>
        <span className="zl-eyebrow">Editar track</span>
        <h1 className="zl-h2" style={{ margin: "10px 0 6px" }}>{track.title}</h1>
        <p className="zl-muted" style={{ marginBottom: 36 }}>
          Toda la metadata vive en PostgreSQL. El archivo de audio original no se modifica.
        </p>
        <TrackEditForm track={track} genres={genres} moods={moods} />
      </section>
    </main>
  );
}
