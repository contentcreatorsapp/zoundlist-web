import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

/** Opens the Stripe billing portal for the current subscriber. */
export async function POST(req: Request) {
  if (!isStripeConfigured) {
    return NextResponse.json({ error: "Los pagos aún no están configurados." }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión primero." }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: "No tienes una suscripción activa." }, { status: 400 });
  }

  const stripe = getStripe();
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id as string,
    return_url: `${origin}/dashboard`,
  });

  return NextResponse.json({ url: session.url });
}
