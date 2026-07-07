import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CORS_HEADERS } from "@/lib/supabase/extension-auth";

export const runtime = "nodejs";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// Called by the Zoundlist content script running on zoundlist.com.
// Cookie auth is automatic (same origin). Returns the JWT for the extension to use.
export async function GET() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.json({
    accessToken: session.access_token,
    expiresAt:   session.expires_at ?? null,
  });
}
