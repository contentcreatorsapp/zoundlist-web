import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateCertificatePdf } from "@/lib/certificate";

export const runtime = "nodejs";

/** Returns the license certificate PDF for one of the user's downloads. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta el id." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });

  const admin = createAdminClient();
  const { data: dl } = await admin
    .from("downloads")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!dl) return NextResponse.json({ error: "Certificado no encontrado." }, { status: 404 });

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const licensee = (profile?.full_name as string) || user.email || "—";
  const plan = dl.plan ? `${(dl.plan as string)[0].toUpperCase()}${(dl.plan as string).slice(1)}` : "—";
  const trackIdDisplay = dl.track_id ? `TRK-${String(dl.track_id).slice(0, 8).toUpperCase()}` : "—";

  const pdf = await generateCertificatePdf({
    certificateNumber: dl.certificate_number,
    licensee,
    trackTitle: dl.track_title,
    trackId: trackIdDisplay,
    plan,
    date: new Date(dl.created_at).toLocaleDateString("es"),
  });

  return new Response(pdf as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${dl.certificate_number}.pdf"`,
    },
  });
}
