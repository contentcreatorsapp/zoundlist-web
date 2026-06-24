import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for use in Client Components / browser code.
 * Reads public env vars (inlined at build time).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

/** True when Supabase env vars are configured. Lets the UI degrade gracefully. */
export const isSupabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
