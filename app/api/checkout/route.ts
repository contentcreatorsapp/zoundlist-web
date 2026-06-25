import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { isPlanKey, priceIdFor } from "@/lib/billing/plans";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isStripeConfigured) {
    return NextResponse.json({ error: "Los pagos aún no están configurados." }, { status: 503 });
  }

  const { plan } = await req.json().catch(() => ({}));
  if (!plan || !isPlanKey(plan)) {
    return NextResponse.json({ error: "Plan inválido." }, { status: 400 });
  }

  const priceId = priceIdFor(plan);
  if (!priceId) {
    return NextResponse.json({ error: "Precio no configurado para ese plan." }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Inicia sesión primero." }, { status: 401 });
  }

  const stripe = getStripe();
  const admin = createAdminClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;

  // Get or create the Stripe customer (stored on the profile via service role).
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  let customerId = profile?.stripe_customer_id as string | undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard?checkout=success`,
    cancel_url: `${origin}/?checkout=cancel`,
    metadata: { user_id: user.id, plan },
    subscription_data: { metadata: { user_id: user.id, plan } },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
