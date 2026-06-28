import { NextRequest, NextResponse } from "next/server";
import { createClient }       from "@/lib/supabase/server";
import { createAdminClient }  from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ albumId: string }> };

// ── PATCH: toggle published ───────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { albumId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { published } = await req.json();

  const admin = createAdminClient();

  // Verify ownership or admin role
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const isAdmin = profile?.role === "admin";

  const albumQuery = admin.from("albums").select("id, uploader_id").eq("id", albumId).maybeSingle();
  const { data: album } = await albumQuery;

  if (!album) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isAdmin && album.uploader_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await admin.from("albums").update({ published }).eq("id", albumId);

  return NextResponse.json({ published });
}

// ── DELETE: remove album + tracks + storage files ─────────────────────────────
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { albumId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const isAdmin = profile?.role === "admin";

  const { data: album } = await admin.from("albums").select("id, uploader_id").eq("id", albumId).maybeSingle();
  if (!album) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isAdmin && album.uploader_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // 1. Get all track audio paths
  const { data: tracks } = await admin.from("tracks").select("audio_path").eq("album_id", albumId);
  const paths = (tracks ?? []).map(t => t.audio_path).filter(Boolean) as string[];

  // 2. Delete audio files from Storage
  if (paths.length > 0) {
    await admin.storage.from("tracks").remove(paths);
  }

  // 3. Delete album (tracks cascade via FK)
  await admin.from("albums").delete().eq("id", albumId);

  return NextResponse.json({ deleted: true });
}
