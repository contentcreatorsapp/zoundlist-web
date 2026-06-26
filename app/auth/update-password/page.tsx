"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/brand";
import { updatePassword } from "@/services/auth";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handle = async () => {
    setError(null);
    if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);
    if (error) { setError(error.message); return; }
    setDone(true);
    setTimeout(() => { router.replace("/dashboard"); router.refresh(); }, 1500);
  };

  return (
    <main style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="zl-wrap" style={{ height: 72, display: "flex", alignItems: "center" }}><Brand height={22} /></div>
      </header>
      <section className="zl-wrap" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 0" }}>
        <div className="zl-card" style={{ padding: 32, maxWidth: 420, width: "100%" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 8, letterSpacing: "-0.02em" }}>Nueva contraseña</h1>
          {done ? (
            <p style={{ color: "var(--brand)", fontWeight: 600, marginTop: 8 }}>✓ Contraseña actualizada. Entrando…</p>
          ) : (
            <>
              <p style={{ fontSize: "0.9rem", color: "var(--text-2)", marginBottom: 22 }}>Elige una contraseña nueva para tu cuenta.</p>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Contraseña</label>
              <input className="zl-input" type="password" placeholder="Mínimo 8 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handle(); }} style={{ marginBottom: error ? 12 : 22 }} />
              {error && <p style={{ fontSize: "0.8rem", color: "var(--orange)", marginBottom: 16 }}>{error}</p>}
              <button className="zl-btn zl-btn--primary zl-btn--block" onClick={handle} disabled={loading}>{loading ? "Guardando…" : "Guardar contraseña"}</button>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
