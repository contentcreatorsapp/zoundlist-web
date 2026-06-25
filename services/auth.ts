import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

/** Thrown when auth is used before Supabase env vars are set. */
export class AuthNotConfiguredError extends Error {
  constructor() {
    super("Supabase no está configurado todavía.");
    this.name = "AuthNotConfiguredError";
  }
}

/**
 * Passwordless magic link.
 * - Sign-up: createUser = true (default) — creates the account on first use.
 * - Log-in:  createUser = false — only sends a link to existing accounts;
 *   an unknown email returns an error instead of silently creating one.
 * Browser-only (relies on window.location.origin for the redirect).
 */
export async function signInWithMagicLink(
  email: string,
  fullName?: string,
  createUser: boolean = true,
) {
  if (!isSupabaseConfigured) throw new AuthNotConfiguredError();

  const supabase = createClient();
  return supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: createUser,
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
