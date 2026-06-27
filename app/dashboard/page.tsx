import { redirect } from "next/navigation";
import { getMyProfile, isSubscriptionActive, canUpload } from "@/services/profile";
import { getMyDownloads } from "@/services/downloads";
import { getMyTracksWithStats } from "@/services/producer";
import { Brand } from "@/components/brand";
import { SignOutButton } from "./sign-out-button";
import { ManageBillingButton } from "./manage-billing-button";
import { COVERS } from "@/lib/catalog/covers";

export const metadata = { title: "Mi panel · Zoundlist" };
export const dynamic = "force-dynamic";

const PLAN_NAMES: Record<string, string> = { creator: "Creator", pro: "Pro", church: "Iglesias / ONGs" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect("/");
  }

  const profile = await getMyProfile();
  if (!profile) redirect("/?auth=required");

  const { checkout } = await searchParams;
  const [downloads, myTracks] = await Promise.all([
    getMyDownloads(),
    canUpload(profile) ? getMyTracksWithStats() : Promise.resolve([]),
  ]);
  const isAdmin = profile.role === "admin";
  const isProducer = profile.role === "producer";
  const uploaderAccess = canUpload(profile);
  const active = isSubscriptionActive(profile);
  const planName = profile.plan ? PLAN_NAMES[profile.plan] ?? profile.plan : null;
  const displayName = profile.artistName || profile.fullName || profile.email?.split("@")[0] || "artista";

  return (
    <main style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
      {/* Top bar */}
      <header style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="zl-wrap" style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Brand height={22} />
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {isAdmin && <span className="zl-tag" style={{ color: "var(--brand)", borderColor: "rgba(149,249,8,0.3)" }}>Admin</span>}
            {isProducer && <span className="zl-tag" style={{ color: "var(--brand)", borderColor: "rgba(149,249,8,0.3)" }}>Productor</span>}
            <span style={{ fontSize: "0.85rem", color: "var(--text-2)" }} className="zl-hide-md">{profile.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Producer profile banner */}
      {uploaderAccess && (
        <div style={{ position: "relative", width: "100%", height: 180, overflow: "hidden" }}>
          <div style={{
            position: "absolute", inset: 0,
            background: profile.bannerUrl
              ? `url(${profile.bannerUrl}) center/cover no-repeat`
              : "linear-gradient(135deg, #0d1a06 0%, #0f0f0f 50%, #091510 100%)",
          }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 30%, rgba(13,13,13,0.95) 100%)" }} />
        </div>
      )}

      <section className="zl-wrap" style={{ paddingTop: uploaderAccess ? 0 : 56, paddingBottom: 80 }}>

        {/* Producer identity block */}
        {uploaderAccess && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 20, marginTop: -44, marginBottom: 40, position: "relative", zIndex: 2 }}>
            <div style={{
              width: 88, height: 88, borderRadius: "50%", flexShrink: 0,
              border: "4px solid var(--bg)", overflow: "hidden",
              background: profile.avatarUrl ? `url(${profile.avatarUrl}) center/cover no-repeat` : "var(--surface)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {!profile.avatarUrl && (
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              )}
            </div>
            <div style={{ paddingBottom: 4 }}>
              <span className="zl-eyebrow" style={{ marginBottom: 4, display: "block" }}>{isAdmin ? "Admin" : "Productor"} · Zoundlist</span>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text)", margin: 0, lineHeight: 1.1 }}>{displayName}</h1>
            </div>
            <div style={{ marginLeft: "auto", paddingBottom: 4 }}>
              <a href="/dashboard/perfil" className="zl-btn zl-btn--ghost zl-btn--sm">Editar perfil →</a>
            </div>
          </div>
        )}

        {/* Regular user greeting */}
        {!uploaderAccess && (
          <>
            <span className="zl-eyebrow">Tu panel</span>
            <h1 className="zl-h2" style={{ margin: "12px 0 10px" }}>Hola, {displayName} 👋</h1>
            <p className="zl-muted" style={{ maxWidth: 520, marginBottom: 40 }}>
              Tu cuenta está activa. Desde aquí gestionas tus descargas y licencias.
            </p>
          </>
        )}

        {checkout === "success" && (
          <div style={{ marginBottom: 28, padding: "14px 18px", borderRadius: "var(--r)", background: "rgba(149,249,8,0.07)", border: "1px solid rgba(149,249,8,0.3)", color: "var(--text)", fontSize: "0.9rem" }}>
            ✓ ¡Pago recibido! Tu suscripción se activará en unos segundos. Si no ves el plan aún, refresca la página.
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>

          {/* Upload — producers & admins */}
          {uploaderAccess ? (
            <a href="/dashboard/upload" className="zl-card" style={{ padding: 24, textDecoration: "none", display: "block" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <h3 style={{ fontSize: "1.02rem", fontWeight: 700, color: "var(--text)" }}>Subir música →</h3>
                <span className="zl-pill-new">Activo</span>
              </div>
              <p style={{ fontSize: "0.86rem", color: "var(--text-2)", lineHeight: 1.55 }}>Carga tracks al catálogo: audio, metadatos y portada.</p>
            </a>
          ) : (
            <div className="zl-card" style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <h3 style={{ fontSize: "1.02rem", fontWeight: 700 }}>Subir música</h3>
                <span className="zl-tag">Solo productores</span>
              </div>
              <p style={{ fontSize: "0.86rem", color: "var(--text-2)", lineHeight: 1.55 }}>La carga de música está reservada a los artistas de Zoundlist.</p>
            </div>
          )}

          {/* Perfil público — solo productores/admins */}
          {uploaderAccess && (
            <div className="zl-card" style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <h3 style={{ fontSize: "1.02rem", fontWeight: 700 }}>Mi perfil público</h3>
                {profile.artistSlug ? <span className="zl-pill-new">Activo</span> : <span className="zl-tag">Sin configurar</span>}
              </div>
              {profile.artistSlug ? (
                <>
                  <p style={{ fontSize: "0.86rem", color: "var(--text-2)", lineHeight: 1.55, marginBottom: 14 }}>
                    Tu página pública en Zoundlist.
                  </p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <a href={`/artistas/${profile.artistSlug}`} target="_blank" rel="noopener noreferrer" className="zl-btn zl-btn--ghost zl-btn--sm">Ver página →</a>
                    <a href="/dashboard/perfil" className="zl-btn zl-btn--ghost zl-btn--sm">Editar</a>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ fontSize: "0.86rem", color: "var(--text-2)", lineHeight: 1.55, marginBottom: 14 }}>
                    Configura tu perfil para que los usuarios te encuentren.
                  </p>
                  <a href="/dashboard/perfil" className="zl-btn zl-btn--primary zl-btn--sm">Configurar perfil →</a>
                </>
              )}
            </div>
          )}

          {/* Mi plan */}
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

          {/* Mis descargas */}
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

        {/* Mis tracks — solo productores/admins */}
        {uploaderAccess && (
          <div style={{ marginTop: 40 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 700 }}>
                Mis tracks <span style={{ fontSize: "0.82rem", fontWeight: 400, color: "var(--text-3)", marginLeft: 8 }}>{myTracks.length} publicados</span>
              </h2>
              <a href="/dashboard/upload" className="zl-btn zl-btn--primary zl-btn--sm">+ Subir track</a>
            </div>

            {myTracks.length === 0 ? (
              <div className="zl-card" style={{ padding: "32px 24px", textAlign: "center" }}>
                <p className="zl-muted" style={{ marginBottom: 16 }}>Aún no has subido ningún track. ¡Empieza ahora!</p>
                <a href="/dashboard/upload" className="zl-btn zl-btn--primary zl-btn--sm">Subir primer track</a>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {myTracks.map((track) => (
                  <div key={track.id} className="zl-card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 16 }}>
                    {/* Cover */}
                    <div style={{
                      width: 48, height: 48, borderRadius: 10, flexShrink: 0, overflow: "hidden",
                      background: track.coverImage ? `url(${track.coverImage}) center/cover no-repeat` : COVERS[track.cover],
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem",
                    }}>
                      {!track.coverImage && track.glyph}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: "0.92rem", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.title}</p>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-3)", margin: "3px 0 0" }}>
                        {track.genre} · {track.mood} {track.bpm ? `· ${track.bpm} BPM` : ""} {track.duration ? `· ${track.duration}` : ""}
                      </p>
                    </div>

                    {/* Stats */}
                    <div style={{ display: "flex", alignItems: "center", gap: 18, flexShrink: 0 }}>
                      <div style={{ textAlign: "center" }}>
                        <p style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: track.downloadCount > 0 ? "var(--brand)" : "var(--text-3)" }}>{track.downloadCount}</p>
                        <p style={{ fontSize: "0.68rem", color: "var(--text-3)", margin: 0 }}>descargas</p>
                      </div>
                      <span className={track.published ? "zl-pill-new" : "zl-tag"} style={{ fontSize: "0.7rem" }}>
                        {track.published ? "Publicado" : "Borrador"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </section>
    </main>
  );
}
