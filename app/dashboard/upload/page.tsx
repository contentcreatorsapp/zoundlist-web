import { redirect } from "next/navigation";
import { getMyProfile, canUpload } from "@/services/profile";
import { getCatalog } from "@/services/catalog";
import { Brand } from "@/components/brand";
import { UploadTabs } from "./upload-tabs";

export const metadata = { title: "Subir música" };
export const dynamic = "force-dynamic";

export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<{ album?: string }>;
}) {
  const profile = await getMyProfile();
  if (!profile) redirect("/?auth=required");
  if (!canUpload(profile)) redirect("/dashboard");

  const { genres, moods } = await getCatalog();
  const { album: albumId } = await searchParams;

  const backHref = albumId ? `/dashboard/albums/${albumId}` : "/dashboard";

  return (
    <main style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
      <header style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="zl-wrap" style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Brand height={22} href="/dashboard" />
          <a href={backHref} className="zl-btn zl-btn--ghost zl-btn--sm">← {albumId ? "Volver al álbum" : "Mi panel"}</a>
        </div>
      </header>

      <section className="zl-wrap" style={{ paddingTop: 48, paddingBottom: 80, maxWidth: 760 }}>
        <span className="zl-eyebrow">Catálogo</span>
        <h1 className="zl-h2" style={{ margin: "12px 0 10px" }}>Subir track</h1>
        <p className="zl-muted" style={{ maxWidth: 520, marginBottom: 36 }}>
          {albumId ? "El track se añadirá a este álbum automáticamente." : "Carga un track al catálogo. Aparecerá en la home en ~1 minuto."}
        </p>
        <UploadTabs genres={genres} moods={moods} albumId={albumId} />
      </section>
    </main>
  );
}
