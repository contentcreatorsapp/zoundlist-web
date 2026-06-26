import { createClient } from "@/lib/supabase/server";

export interface DownloadRow {
  id: string;
  trackTitle: string;
  certificateNumber: string;
  createdAt: string;
}

/** The current user's downloads (most recent first). RLS limits to own rows. */
export async function getMyDownloads(): Promise<DownloadRow[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("downloads")
    .select("id, track_title, certificate_number, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []).map((r) => ({
    id: r.id as string,
    trackTitle: r.track_title as string,
    certificateNumber: r.certificate_number as string,
    createdAt: r.created_at as string,
  }));
}
