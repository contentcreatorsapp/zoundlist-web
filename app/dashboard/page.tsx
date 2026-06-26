import { redirect } from "next/navigation";
import { getMyProfile, isSubscriptionActive } from "@/services/profile";
import { getMyDownloads } from "@/services/downloads";
import { Brand } from "@/components/brand";
import { SignOutButton } from "./sign-out-button";
import { ManageBillingButton } from "./manage-billing-button";

export const metadata = { title: "Mi panel" };
export const dynamic = "force-dynamic";

const PLAN_NAMES: Record<string, string> = { creator: "Creator", pro: "Pro", church: "Iglesias / ONGs" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  // Degrade gracefully if Supabase isn't configured yet.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect("/");
  }

  const profile = await getMyProfile();
  if (!profile) redirect("/?auth=required");

  const { checkout } = await searchParams;
  const downloads = await getMyDownloads();
  const isAdmin = profile.role === "admin";
  const active = isSubscriptionActive(profile);
  const planName = profile.plan ? PLAN_NAMES[profile.plan] ?? profile.plan : null;
  const name = profile.fullName || profile.email?.split("@")[0] || "creador";

  return (
    <main style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
      {/* Top bar */}
      <header style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="zl-wrap" style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Brand height={22} />
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {isAdmin && <span className="zl-tag" style={{ color: "var(--brand)", borderColor: "rgba(149,249,8,0.3)" }}>Admin</span>}
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

        {checkout === "success" && (
          <div style={{ marginTop: 24, padding: "14px 18px", borderRadius: "var(--r)", background: "var(--brand-dim)", border: "1px solid rgba(149,249,8,0.3)", color: "var(--text)", fontSize: "0.9rem" }}>
            ✓ ¡Pago recibido! Tu suscripción se activará en unos segundos. Si no ves el plan aún, refresca la página.
          </div>
        )}

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

          {/* Mi plan — real subscription status */}
          <div className="zl-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <h3 style={{ fontSize: "1.02rem", fontWeight: 700 }}>Mi plan</h3>
              {active
                ? <span className="zl-pill-new">{planName ?? "Activo"}</span>
                : <span className="zl-tag">Sin plan</span>}
            </div>
            {active ? (
              <>
                <p style={{ fontSize: "0.86rem", color: "var(--text-2)", lineHeight: 1.55 }}>
                  Tu plan <strong style={{ color: "var(--text)" }}>{planName}</strong> está activo.
                  {profile.currentPeriodEnd ? ` Se renueva el ${new Date(profile.currentPeriodEnd).toLocaleDateString("es")}.` : ""}
                </p>
                <ManageBillingButton />
              </>
            ) : (
              <>
                <p style={{ fontSize: "0.86rem", color: "var(--text-2)", lineHeight: 1.55 }}>
                  Aún no tienes una suscripción activa. Elige un plan para descargar con licencia.
                </p>
                <a href="/#pricing" className="zl-btn zl-btn--primary zl-btn--sm" style={{ marginTop: 14 }}>Ver planes</a>
              </>
            )}
          </div>

          {/* Mis descargas — real history + license certificates */}
          <div className="zl-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <h3 style={{ fontSize: "1.02rem", fontWeight: 700 }}>Mis descargas</h3>
              <span className="zl-tag">{downloads.length}</span>
            </div>
            {downloads.length === 0 ? (
              <p style={{ fontSize: "0.86rem", color: "var(--text-2)", lineHeight: 1.55 }}>
                Aún no has descargado nada. Cada descarga genera su certificado de licencia.
              </p>
            ) : (
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {downloads.slice(0, 6).map((d) => (
                  <li key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: "0.86rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.trackTitle}</span>
                      <span style={{ display: "block", fontSize: "0.72rem", color: "var(--text-3)" }}>{d.certificateNumber}</span>
                    </span>
                    <a href={`/api/certificate?id=${d.id}`} className="zl-btn zl-btn--ghost zl-btn--sm" style={{ flexShrink: 0 }}>Certificado</a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
