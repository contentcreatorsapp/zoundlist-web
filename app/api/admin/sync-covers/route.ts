import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const GENRES = ["corporate", "cinematic", "electronic", "ambient", "jazz"];

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const admin = createAdminClient();
  let synced = 0;

  for (const genre of GENRES) {
    const { data: files } = await admin.storage
      .from("covers").list(genre, { limit: 100 });

    if (!files) continue;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.name || file.name === ".emptyFolderPlaceholder") continue;

      const storagePath = `${genre}/${file.name}`;
      const { data: { publicUrl } } = admin.storage
        .from("covers").getPublicUrl(storagePath);

      await admin.from("cover_assets").upsert({
        genre_slug:   genre,
        storage_path: storagePath,
        public_url:   publicUrl,
        sort_order:   i,
      }, { onConflict: "storage_path" });

      synced++;
    }
  }

  return NextResponse.json({ synced });
}
