import { redirect } from "next/navigation";
import { getMyProfile, canUpload } from "@/services/profile";
import { getCatalog } from "@/services/catalog";
import { Brand } from "@/components/brand";
import { AlbumForm } from "./album-form";

export const metadata = { title: "Nuevo álbum · Zoundlist" };
export const dynamic = "force-dynamic";

export default async function NewAlbumPage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/?auth=required");
  if (!canUpload(profile)) redirect("/dashboard");

  const { genres, moods } = await getCatalog();

  return (
    <main style={{ minHeight: "100vh" }}>
      <header style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="zl-wrap" style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Brand height={22} href="/dashboard" />
          <a href="/dashboard" className="zl-btn zl-btn--ghost zl-btn--sm">← Mi panel</a>
        </div>
      </header>
      <section className="zl-wrap" style={{ paddingTop: 48, paddingBottom: 80, maxWidth: 720 }}>
        <span className="zl-eyebrow">Catálogo</span>
        <h1 className="zl-h2" style={{ margin: "12px 0 8px" }}>Nuevo álbum</h1>
        <p className="zl-muted" style={{ marginBottom: 36 }}>Crea un álbum y luego añade los tracks uno a uno.</p>
        <AlbumForm genres={genres} moods={moods} uploaderId={profile.id} />
      </section>
    </main>
  );
}
