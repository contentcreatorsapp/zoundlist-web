import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const genre = req.nextUrl.searchParams.get("genre");
  const admin = createAdminClient();

  let query = admin
    .from("cover_assets")
    .select("id, genre_slug, public_url, storage_path, sort_order")
    .eq("active", true)
    .order("sort_order");

  if (genre) query = query.eq("genre_slug", genre);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ covers: data ?? [] });
}
