import { createClient } from "@/lib/supabase/server";

export interface Profile {
  id: string;
  email: string | null;
  fullName: string | null;
  role: "user" | "admin";
  plan: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
}

/** True for statuses that grant access (active or in trial). */
export function isSubscriptionActive(p: Profile | null): boolean {
  return p?.subscriptionStatus === "active" || p?.subscriptionStatus === "trialing";
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
    .select("id, full_name, role, plan, subscription_status, current_period_end")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: (data?.full_name as string) ?? (user.user_metadata?.full_name as string) ?? null,
    role: (data?.role as "user" | "admin") ?? "user",
    plan: (data?.plan as string) ?? null,
    subscriptionStatus: (data?.subscription_status as string) ?? null,
    currentPeriodEnd: (data?.current_period_end as string) ?? null,
  };
}
