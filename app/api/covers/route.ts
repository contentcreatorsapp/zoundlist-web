import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const genre   = req.nextUrl.searchParams.get("genre");
  const albumId = req.nextUrl.searchParams.get("albumId");
  const admin   = createAdminClient();

  let query = admin
    .from("cover_assets")
    .select("id, genre_slug, public_url, storage_path, sort_order")
    .eq("active", true)
    .order("sort_order");

  if (genre) query = query.eq("genre_slug", genre);

  const [{ data: covers, error }, { data: usedRows }] = await Promise.all([
    query,
    admin.from("albums").select("cover_image").not("cover_image", "is", null),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Exclude the current album from the "in use" set
  const usedUrls = new Set(
    (usedRows ?? [])
      .filter(r => r.cover_image)
      .map(r => r.cover_image as string)
  );

  const result = (covers ?? []).map(c => ({
    ...c,
    in_use: usedUrls.has(c.public_url),
  }));

  return NextResponse.json({ covers: result });
}
