import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";
export const alt = "Zoundlist — Música para lo que estás creando";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const wordmark = readFileSync(join(process.cwd(), "public/zoundlist-wordmark.png"));
  const wordmarkSrc = `data:image/png;base64,${wordmark.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0A0A0A",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "90px",
          position: "relative",
        }}
      >
        {/* brand green glow */}
        <div
          style={{
            position: "absolute",
            top: -160,
            right: -120,
            width: 620,
            height: 620,
            background: "radial-gradient(circle, rgba(149,249,8,0.30), rgba(149,249,8,0) 60%)",
          }}
        />
        {/* fine top accent line */}
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 6, background: "#95F908" }} />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={wordmarkSrc} width={520} height={98} alt="Zoundlist" style={{ objectFit: "contain" }} />

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            marginTop: 40,
            fontSize: 60,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "#FFFFFF",
            maxWidth: 940,
            lineHeight: 1.05,
          }}
        >
          <span>Música para lo que estás&nbsp;</span>
          <span style={{ color: "#95F908" }}>creando.</span>
        </div>

        <div style={{ marginTop: 30, fontSize: 28, color: "rgba(255,255,255,0.6)" }}>
          Música creada con IA y curada a mano · Licencia incluida
        </div>

        <div style={{ position: "absolute", bottom: 70, left: 90, fontSize: 26, color: "rgba(255,255,255,0.42)" }}>
          zoundlist.com
        </div>
      </div>
    ),
    { ...size },
  );
}
