import Link from "next/link";
import { Brand } from "@/components/brand";

const DOCS = [
  ["Términos de uso", "/terminos"],
  ["Privacidad", "/privacidad"],
  ["Términos de licencia", "/licencia"],
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="zl-wrap" style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Brand height={22} />
          <Link href="/" className="zl-btn zl-btn--ghost zl-btn--sm">← Inicio</Link>
        </div>
      </header>

      <section className="zl-wrap" style={{ paddingTop: 56, paddingBottom: 72, flex: 1 }}>
        {children}
      </section>

      <footer style={{ borderTop: "1px solid var(--border)", padding: "32px 0" }}>
        <div className="zl-wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <ul style={{ display: "flex", gap: 24, listStyle: "none", flexWrap: "wrap" }}>
            {DOCS.map(([label, href]) => (
              <li key={href}><Link href={href} className="zl-foot-link">{label}</Link></li>
            ))}
          </ul>
          <p style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>© 2026 Zoundlist · JM Creativos LLC · Puerto Rico</p>
        </div>
      </footer>
    </main>
  );
}
