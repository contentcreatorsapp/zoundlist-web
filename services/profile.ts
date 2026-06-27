import { createClient } from "@/lib/supabase/server";

export interface Profile {
  id: string;
  email: string | null;
  fullName: string | null;
  role: "user" | "admin" | "producer";
  plan: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  // Producer profile fields
  artistName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  instagram: string | null;
  youtube: string | null;
  website: string | null;
  artistSlug: string | null;
}

export function isSubscriptionActive(p: Profile | null): boolean {
  return p?.subscriptionStatus === "active" || p?.subscriptionStatus === "trialing";
}

export function canUpload(p: Profile | null): boolean {
  return p?.role === "admin" || p?.role === "producer";
}

export async function getMyProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role, plan, subscription_status, current_period_end, artist_name, bio, avatar_url, banner_url, instagram, youtube, website, artist_slug")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: (data?.full_name as string) ?? (user.user_metadata?.full_name as string) ?? null,
    role: (data?.role as "user" | "admin" | "producer") ?? "user",
    plan: (data?.plan as string) ?? null,
    subscriptionStatus: (data?.subscription_status as string) ?? null,
    currentPeriodEnd: (data?.current_period_end as string) ?? null,
    artistName: (data?.artist_name as string) ?? null,
    bio: (data?.bio as string) ?? null,
    avatarUrl: (data?.avatar_url as string) ?? null,
    bannerUrl: (data?.banner_url as string) ?? null,
    instagram: (data?.instagram as string) ?? null,
    youtube: (data?.youtube as string) ?? null,
    website: (data?.website as string) ?? null,
    artistSlug: (data?.artist_slug as string) ?? null,
  };
}

export async function getPublicArtist(slug: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role, artist_name, bio, avatar_url, banner_url, instagram, youtube, website, artist_slug")
    .eq("artist_slug", slug)
    .in("role", ["admin", "producer"])
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id as string,
    email: null,
    fullName: (data.full_name as string) ?? null,
    role: (data.role as "user" | "admin" | "producer"),
    plan: null,
    subscriptionStatus: null,
    currentPeriodEnd: null,
    artistName: (data.artist_name as string) ?? null,
    bio: (data.bio as string) ?? null,
    avatarUrl: (data.avatar_url as string) ?? null,
    bannerUrl: (data.banner_url as string) ?? null,
    instagram: (data.instagram as string) ?? null,
    youtube: (data.youtube as string) ?? null,
    website: (data.website as string) ?? null,
    artistSlug: (data.artist_slug as string) ?? null,
  };
}
