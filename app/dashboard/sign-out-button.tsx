"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/services/auth";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true);
    try {
      await signOut();
      router.replace("/");
      router.refresh();
    } catch {
      setLoading(false);
    }
  };

  return (
    <button className="zl-btn zl-btn--ghost zl-btn--sm" onClick={handle} disabled={loading}>
      {loading ? "Saliendo…" : "Cerrar sesión"}
    </button>
  );
}
