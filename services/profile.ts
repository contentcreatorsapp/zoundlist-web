import { createClient } from "@/lib/supabase/server";

export interface Profile {
  id: string;
  email: string | null;
  fullName: string | null;
  role: "user" | "admin";
}

/** Current user's profile (server-side), or null if not signed in. */
export async function getMyProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: (data?.full_name as string) ?? (user.user_metadata?.full_name as string) ?? null,
    role: (data?.role as "user" | "admin") ?? "user",
  };
}
