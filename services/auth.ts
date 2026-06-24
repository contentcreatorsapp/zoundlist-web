import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

/** Thrown when auth is used before Supabase env vars are set. */
export class AuthNotConfiguredError extends Error {
  constructor() {
    super("Supabase no está configurado todavía.");
    this.name = "AuthNotConfiguredError";
  }
}

/**
 * Passwordless sign-in / sign-up via magic link.
 * Creates the user on first use (shouldCreateUser defaults to true).
 * Browser-only (relies on window.location.origin for the redirect).
 */
export async function signInWithMagicLink(email: string, fullName?: string) {
  if (!isSupabaseConfigured) throw new AuthNotConfiguredError();

  const supabase = createClient();
  return supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: fullName ? { full_name: fullName } : undefined,
    },
  });
}

export async function signOut() {
  if (!isSupabaseConfigured) throw new AuthNotConfiguredError();
  const supabase = createClient();
  return supabase.auth.signOut();
}

/** Current user on the client, or null. Returns null when unconfigured. */
export async function getCurrentUser() {
  if (!isSupabaseConfigured) return null;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
