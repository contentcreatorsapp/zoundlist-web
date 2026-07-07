import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import type { NextRequest, NextResponse } from "next/server";

function supabaseUrl() { return process.env.NEXT_PUBLIC_SUPABASE_URL!; }
function supabaseAnon() { return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; }

/** Validate a Supabase JWT from the Authorization: Bearer header */
export async function getUserFromExtensionRequest(req: NextRequest): Promise<User | null> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  const supabase = createSupabaseClient(supabaseUrl(), supabaseAnon(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user } } = await supabase.auth.getUser(token);
  return user ?? null;
}

/** Create a user-scoped Supabase client that sends RLS-aware Bearer auth */
export function createUserSupabase(token: string) {
  return createSupabaseClient(supabaseUrl(), supabaseAnon(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

/** Standard CORS headers for extension API routes */
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
} as const;

export function corsResponse(res: NextResponse) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}
