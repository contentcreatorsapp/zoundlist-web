import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Página no encontrada",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "var(--void)", color: "var(--text-primary)",
      fontFamily: "inherit", gap: 24, padding: 24,
    }}>
      <div style={{ fontSize: "4rem", fontWeight: 700, letterSpacing: "-0.04em", color: "var(--text-muted)" }}>404</div>
      <h1 style={{ fontSize: "1.4rem", fontWeight: 700, textAlign: "center" }}>
        Esta pista no está en el catálogo
      </h1>
      <p style={{ color: "var(--text-secondary)", textAlign: "center", maxWidth: 400 }}>
        La página que buscas no existe o fue movida. Vuelve al inicio y encuentra la música perfecta para tu proyecto.
      </p>
      <Link href="/" style={{
        padding: "13px 28px", borderRadius: 14,
        background: "var(--amber)", color: "#080b14",
        textDecoration: "none", fontWeight: 700, fontSize: "0.95rem",
      }}>Volver al inicio →</Link>
    </main>
  );
}
