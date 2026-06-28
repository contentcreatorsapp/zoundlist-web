"use client";

import { useState } from "react";

export function SyncCoversButton() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [count, setCount]  = useState(0);

  const sync = async () => {
    setState("loading");
    const res  = await fetch("/api/admin/sync-covers", { method: "POST" });
    const data = await res.json();
    if (res.ok) { setCount(data.synced); setState("done"); }
    else setState("error");
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button
        className="zl-btn zl-btn--primary zl-btn--sm"
        onClick={sync}
        disabled={state === "loading"}
      >
        {state === "loading" ? "Sincronizando…" : "🔄 Sincronizar portadas"}
      </button>
      {state === "done"  && <span style={{ fontSize: "0.8rem", color: "var(--brand)" }}>✓ {count} portadas sincronizadas</span>}
      {state === "error" && <span style={{ fontSize: "0.8rem", color: "var(--orange)" }}>Error al sincronizar</span>}
    </div>
  );
}
