import { redirect } from "next/navigation";
import { getMyProfile, canUpload } from "@/services/profile";
import { Brand } from "@/components/brand";
import { SignOutButton } from "../sign-out-button";
import { PerfilForm } from "./perfil-form";

export const metadata = { title: "Mi perfil · Zoundlist" };
export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) redirect("/");

  const profile = await getMyProfile();
  if (!profile) redirect("/?auth=required");
  if (!canUpload(profile)) redirect("/dashboard");

  return (
    <main style={{ minHeight: "100vh" }}>
      <header style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="zl-wrap" style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Brand height={22} />
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <a href="/dashboard" style={{ fontSize: "0.85rem", color: "var(--text-2)", textDecoration: "none" }}>← Mi panel</a>
            <SignOutButton />
          </div>
        </div>
      </header>

      <section className="zl-wrap" style={{ paddingTop: 48, paddingBottom: 80, maxWidth: 720 }}>
        <span className="zl-eyebrow">Tu presencia en Zoundlist</span>
        <h1 className="zl-h2" style={{ margin: "12px 0 8px" }}>Perfil de artista</h1>
        <p className="zl-muted" style={{ marginBottom: 40 }}>
          Esta información aparece en tu página pública y en el catálogo.
        </p>
        <PerfilForm profile={profile} />
      </section>
    </main>
  );
}
