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

/** Email + password sign-up. Stores full_name in user metadata. */
export async function signUpWithPassword(email: string, password: string, fullName?: string) {
  if (!isSupabaseConfigured) throw new AuthNotConfiguredError();
  const supabase = createClient();
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: fullName ? { full_name: fullName } : undefined,
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
}

/** Email + password sign-in. */
export async function signInWithPassword(email: string, password: string) {
  if (!isSupabaseConfigured) throw new AuthNotConfiguredError();
  const supabase = createClient();
  return supabase.auth.signInWithPassword({ email, password });
}

/** Sends a password-reset email; the link lands on /auth/update-password. */
export async function resetPassword(email: string) {
  if (!isSupabaseConfigured) throw new AuthNotConfiguredError();
  const supabase = createClient();
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
  });
}

/** Updates the current user's password (used on the reset page). */
export async function updatePassword(password: string) {
  if (!isSupabaseConfigured) throw new AuthNotConfiguredError();
  const supabase = createClient();
  return supabase.auth.updateUser({ password });
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
