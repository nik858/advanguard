import "server-only";
import Stripe from "stripe";

// Lazy singleton so importing this module never throws at build time —
// the key is only required when a paid-funnel route actually runs.
let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY not set");
    stripe = new Stripe(key);
  }
  return stripe;
}
