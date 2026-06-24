import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";

export const metadata = { title: "Mi panel" };

export default async function DashboardPage() {
  // Degrade gracefully if Supabase isn't configured yet.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect("/");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware guards this route, but double-check on render.
  if (!user) redirect("/?auth=required");

  const name = (user.user_metadata?.full_name as string) || user.email?.split("@")[0] || "creador";

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
            <span style={{ fontSize: "0.85rem", color: "var(--text-2)" }}>{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <section className="zl-wrap" style={{ paddingTop: 56, paddingBottom: 80 }}>
        <span className="zl-eyebrow">Tu panel</span>
        <h1 className="zl-h2" style={{ margin: "12px 0 10px" }}>Hola, {name} 👋</h1>
        <p className="zl-muted" style={{ maxWidth: 520 }}>
          Tu cuenta está activa. Desde aquí gestionarás tus descargas, licencias y —muy pronto— la carga de música al catálogo.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20, marginTop: 40 }}>
          {[
            { title: "Subir música", desc: "Carga de tracks al catálogo curado. Llega en la Fase 3.", soon: true },
            { title: "Mis descargas", desc: "Historial de tracks descargados y sus certificados de licencia.", soon: true },
            { title: "Mi plan", desc: "Gestiona tu suscripción y método de pago.", soon: true },
          ].map((c) => (
            <div key={c.title} className="zl-card" style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <h3 style={{ fontSize: "1.02rem", fontWeight: 700 }}>{c.title}</h3>
                {c.soon && <span className="zl-tag">Próximamente</span>}
              </div>
              <p style={{ fontSize: "0.86rem", color: "var(--text-2)", lineHeight: 1.55 }}>{c.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
