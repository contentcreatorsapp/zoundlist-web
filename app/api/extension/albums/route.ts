import { NextRequest, NextResponse } from "next/server";
import { getUserFromExtensionRequest, createUserSupabase, CORS_HEADERS } from "@/lib/supabase/extension-auth";

export const runtime = "nodejs";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  const user = await getUserFromExtensionRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401, headers: CORS_HEADERS });
  }

  const token = req.headers.get("Authorization")!.replace(/^Bearer\s+/, "");
  const supabase = createUserSupabase(token);

  const { data: albums, error } = await supabase
    .from("albums")
    .select("id, title, cover_url")
    .eq("uploader_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
  }

  return NextResponse.json({ albums: albums ?? [] }, { headers: CORS_HEADERS });
}
