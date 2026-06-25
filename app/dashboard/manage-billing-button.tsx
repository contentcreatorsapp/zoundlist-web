"use client";

import { useState } from "react";

export function ManageBillingButton() {
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing", { method: "POST" });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; return; }
      alert(data.error || "No se pudo abrir el portal de facturación.");
    } catch {
      alert("Error abriendo el portal.");
    }
    setLoading(false);
  };

  return (
    <button className="zl-btn zl-btn--ghost zl-btn--sm" onClick={handle} disabled={loading} style={{ marginTop: 14 }}>
      {loading ? "Abriendo…" : "Gestionar suscripción"}
    </button>
  );
}
