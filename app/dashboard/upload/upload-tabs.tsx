"use client";

import { useState } from "react";
import type { Genre, Mood } from "@/types/catalog";
import { UploadForm } from "./upload-form";
import { ImportSunoForm } from "./import-suno-form";

type Tab = "upload" | "suno";

interface UploadTabsProps {
  genres: Genre[];
  moods: Mood[];
  albumId?: string;
}

export function UploadTabs({ genres, moods, albumId }: UploadTabsProps) {
  const [tab, setTab] = useState<Tab>("upload");

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 32, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        <TabButton label="Upload File" active={tab === "upload"} onClick={() => setTab("upload")} />
        <TabButton
          label={
            <>Import from Suno <span style={{ fontSize: "0.65em", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", background: "rgba(149,249,8,0.15)", color: "var(--brand)", borderRadius: 3, padding: "1px 5px", marginLeft: 6, verticalAlign: "middle" }}>Beta</span></>
          }
          active={tab === "suno"}
          onClick={() => setTab("suno")}
        />
      </div>

      {/* Tab content */}
      {tab === "upload" && <UploadForm genres={genres} moods={moods} albumId={albumId} />}
      {tab === "suno"   && <ImportSunoForm albumId={albumId} />}
    </div>
  );
}

function TabButton({
  label, active, onClick,
}: {
  label: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 18px",
        background: "transparent",
        border: "none",
        borderBottom: active ? "2px solid var(--brand)" : "2px solid transparent",
        color: active ? "var(--text)" : "var(--text-3)",
        fontWeight: active ? 700 : 500,
        fontSize: "0.9rem",
        cursor: "pointer",
        fontFamily: "inherit",
        marginBottom: -1,
        transition: "color 0.15s",
        display: "flex",
        alignItems: "center",
      }}
    >
      {label}
    </button>
  );
}
