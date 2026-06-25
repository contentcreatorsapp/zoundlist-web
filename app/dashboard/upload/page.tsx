import { redirect } from "next/navigation";
import { getMyProfile } from "@/services/profile";
import { getCatalog } from "@/services/catalog";
import { Brand } from "@/components/brand";
import { UploadForm } from "./upload-form";

export const metadata = { title: "Subir música" };
export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/?auth=required");
  if (profile.role !== "admin") redirect("/dashboard");

  const { genres, moods } = await getCatalog();

  return (
    <main style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
      <header style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="zl-wrap" style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Brand height={22} href="/dashboard" />
          <a href="/dashboard" className="zl-btn zl-btn--ghost zl-btn--sm">← Volver al panel</a>
        </div>
      </header>

      <section className="zl-wrap" style={{ paddingTop: 48, paddingBottom: 80, maxWidth: 760 }}>
        <span className="zl-eyebrow">Panel admin</span>
        <h1 className="zl-h2" style={{ margin: "12px 0 10px" }}>Subir música</h1>
        <p className="zl-muted" style={{ maxWidth: 520, marginBottom: 36 }}>
          Carga un track al catálogo curado. El archivo se guarda en Storage y la pista aparece en la home en ~1 minuto.
        </p>
        <UploadForm genres={genres} moods={moods} />
      </section>
    </main>
  );
}
