// Paid plan catalog. Each plan's Stripe Price ID comes from an env var,
// so it works in test and production without code changes.

export type PlanKey = "creator" | "pro" | "church";

export interface Plan {
  key: PlanKey;
  name: string;
  priceEnv: string;
}

export const PLANS: Record<PlanKey, Plan> = {
  creator: { key: "creator", name: "Creator",         priceEnv: "STRIPE_PRICE_CREATOR" },
  pro:     { key: "pro",     name: "Pro",             priceEnv: "STRIPE_PRICE_PRO" },
  church:  { key: "church",  name: "Iglesias / ONGs", priceEnv: "STRIPE_PRICE_CHURCH" },
};

export const PLAN_KEYS = Object.keys(PLANS) as PlanKey[];

export function isPlanKey(value: string): value is PlanKey {
  return value in PLANS;
}

/** Stripe Price ID configured for a plan (from env), or undefined. */
export function priceIdFor(plan: PlanKey): string | undefined {
  return process.env[PLANS[plan].priceEnv];
}

/** Reverse lookup: which plan a Stripe Price ID belongs to. */
export function planForPrice(priceId: string): PlanKey | undefined {
  return PLAN_KEYS.find((k) => process.env[PLANS[k].priceEnv] === priceId);
}
