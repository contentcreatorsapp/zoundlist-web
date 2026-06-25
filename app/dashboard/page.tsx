import { redirect } from "next/navigation";
import { getMyProfile } from "@/services/profile";
import { SignOutButton } from "./sign-out-button";

export const metadata = { title: "Mi panel" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Degrade gracefully if Supabase isn't configured yet.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect("/");
  }

  const profile = await getMyProfile();
  if (!profile) redirect("/?auth=required");

  const isAdmin = profile.role === "admin";
  const name = profile.fullName || profile.email?.split("@")[0] || "creador";

  return (
    <main style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
      {/* Top bar */}
      <header style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="zl-wrap" style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/" className="zl-brand">
            <span className="zl-brand__mark">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="#fff"><path d="M12 3v10.55A4 4 0 1014 17V7h4V3z" /></svg>
            </span>
            <span className="zl-brand__name">Sonoris</span>
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {isAdmin && <span className="zl-tag" style={{ color: "var(--lime)", borderColor: "rgba(205,255,79,0.3)" }}>Admin</span>}
            <span style={{ fontSize: "0.85rem", color: "var(--text-2)" }} className="zl-hide-md">{profile.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <section className="zl-wrap" style={{ paddingTop: 56, paddingBottom: 80 }}>
        <span className="zl-eyebrow">Tu panel</span>
        <h1 className="zl-h2" style={{ margin: "12px 0 10px" }}>Hola, {name} 👋</h1>
        <p className="zl-muted" style={{ maxWidth: 520 }}>
          Tu cuenta está activa. Desde aquí gestionas tus descargas, licencias{isAdmin ? " y la carga de música al catálogo" : ""}.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20, marginTop: 40 }}>
          {/* Upload — live for admins */}
          {isAdmin ? (
            <a href="/dashboard/upload" className="zl-card" style={{ padding: 24, textDecoration: "none", display: "block" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <h3 style={{ fontSize: "1.02rem", fontWeight: 700, color: "var(--text)" }}>Subir música →</h3>
                <span className="zl-pill-new">Activo</span>
              </div>
              <p style={{ fontSize: "0.86rem", color: "var(--text-2)", lineHeight: 1.55 }}>Carga tracks al catálogo curado: audio, metadatos y portada.</p>
            </a>
          ) : (
            <div className="zl-card" style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <h3 style={{ fontSize: "1.02rem", fontWeight: 700 }}>Subir música</h3>
                <span className="zl-tag">Solo admin</span>
              </div>
              <p style={{ fontSize: "0.86rem", color: "var(--text-2)", lineHeight: 1.55 }}>La carga de música está reservada al equipo de curación.</p>
            </div>
          )}

          {[
            { title: "Mis descargas", desc: "Historial de tracks descargados y sus certificados de licencia." },
            { title: "Mi plan", desc: "Gestiona tu suscripción y método de pago." },
          ].map((c) => (
            <div key={c.title} className="zl-card" style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <h3 style={{ fontSize: "1.02rem", fontWeight: 700 }}>{c.title}</h3>
                <span className="zl-tag">Próximamente</span>
              </div>
              <p style={{ fontSize: "0.86rem", color: "var(--text-2)", lineHeight: 1.55 }}>{c.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
