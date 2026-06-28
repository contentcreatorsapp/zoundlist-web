import { redirect } from "next/navigation";
import { getMyProfile } from "@/services/profile";
import { Brand } from "@/components/brand";
import { SyncCoversButton } from "./sync-covers-button";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const profile = await getMyProfile();
  if (!profile || profile.role !== "admin") redirect("/dashboard");

  return (
    <main style={{ minHeight: "100vh" }}>
      <header style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="zl-wrap" style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Brand height={22} href="/dashboard" />
          <a href="/dashboard" className="zl-btn zl-btn--ghost zl-btn--sm">← Dashboard</a>
        </div>
      </header>

      <section className="zl-wrap" style={{ paddingTop: 40, paddingBottom: 80 }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: 32 }}>Admin</h1>

        <div className="zl-card" style={{ padding: 24, maxWidth: 480 }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 8px" }}>Librería de portadas</h2>
          <p style={{ fontSize: "0.82rem", color: "var(--text-3)", margin: "0 0 16px" }}>
            Sincroniza las imágenes del bucket <code>covers/</code> en Supabase Storage
            con la base de datos. Ejecuta cada vez que subas imágenes nuevas.
          </p>
          <SyncCoversButton />
        </div>
      </section>
    </main>
  );
}
