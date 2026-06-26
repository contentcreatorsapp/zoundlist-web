import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { readFileSync } from "fs";
import { join } from "path";

export interface CertificateData {
  certificateNumber: string;
  licensee: string;
  trackTitle: string;
  trackId: string;
  plan: string;
  date: string;
}

const GREEN = rgb(149 / 255, 249 / 255, 8 / 255);
const INK = rgb(0.04, 0.04, 0.04);
const GRAY = rgb(0.42, 0.42, 0.42);

/** Builds a Zoundlist license certificate PDF and returns the bytes. */
export async function generateCertificatePdf(data: CertificateData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Top accent bar
  page.drawRectangle({ x: 0, y: height - 12, width, height: 12, color: GREEN });

  // Logo icon (optional)
  let logoOffset = 56;
  try {
    const iconBytes = readFileSync(join(process.cwd(), "public/zoundlist-icon.png"));
    const icon = await pdf.embedPng(iconBytes);
    const s = 46;
    page.drawImage(icon, { x: 56, y: height - 58 - s, width: s, height: s });
    logoOffset = 56 + s + 16;
  } catch {
    /* logo optional */
  }

  page.drawText("Zoundlist", { x: logoOffset, y: height - 80, size: 24, font: bold, color: INK });
  page.drawText("Certificado de Licencia", { x: logoOffset, y: height - 100, size: 11, font, color: GRAY });

  // Fields
  let y = height - 165;
  const fields: [string, string][] = [
    ["N.º de Certificado", data.certificateNumber],
    ["Licenciatario", data.licensee],
    ["Track", data.trackTitle],
    ["ID de Track", data.trackId],
    ["Plan", data.plan],
    ["Fecha", data.date],
  ];
  for (const [k, v] of fields) {
    page.drawText(k, { x: 56, y, size: 10, font, color: GRAY });
    page.drawText(v, { x: 250, y, size: 11, font: bold, color: INK });
    page.drawLine({ start: { x: 56, y: y - 9 }, end: { x: width - 56, y: y - 9 }, thickness: 0.5, color: rgb(0.9, 0.9, 0.9) });
    y -= 30;
  }

  // Scope
  y -= 12;
  page.drawText("Alcance de licencia", { x: 56, y, size: 11, font: bold, color: INK });
  y -= 22;
  const scope = [
    "YouTube y plataformas de video",
    "Instagram, TikTok, Facebook, X",
    "Podcast y contenido de audio",
    "Transmisiones en vivo",
  ];
  for (const s of scope) {
    page.drawText("•", { x: 56, y, size: 10, font: bold, color: GREEN });
    page.drawText(s, { x: 70, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
    y -= 18;
  }

  // Footer
  page.drawText(
    "Licencia perpetua para el contenido publicado mientras el plan estuvo activo.",
    { x: 56, y: 74, size: 8, font, color: GRAY },
  );
  page.drawText("zoundlist.com · JM Creativos LLC · Pennsylvania, EE. UU.", { x: 56, y: 58, size: 8, font, color: GRAY });

  return pdf.save();
}
