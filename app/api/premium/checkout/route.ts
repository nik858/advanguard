import { NextResponse } from "next/server";
import { z } from "zod";
import { getStripe } from "@/lib/stripe";
import { checkLimit, clientIp, premiumCheckoutLimiter } from "@/lib/ratelimit";
import { normalizeClinicUrl } from "@/lib/audit/domain";
import { CLINIC_TYPES } from "@/lib/leads/clinic-types";
import { paidConfig, parsePaidVariant } from "@/lib/landing/variants";

// Creates the embedded Stripe Checkout session for a paid landing page
// (/premium and /premium.slo share this route — see lib/landing/variants.ts).
// Deliberately does NOT touch the leads table — per spec, no email enters the
// audit system unless the payment completes (see lib/premium/fulfill.ts).

const BodySchema = z.object({
  email: z.string().email(),
  clinic_type: z.enum(CLINIC_TYPES),
  clinic_url: z.string().min(1),
  // Which paid page the buyer is on; anything unknown falls back to /premium.
  variant: z.string().optional(),
  website: z.string().optional(), // honeypot, same convention as /api/lead
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limit = await checkLimit(premiumCheckoutLimiter, ip);
  if (!limit.success) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Please fill in all fields." }, { status: 400 });

  // Honeypot: silently accept but do nothing — bots think they succeeded.
  if (parsed.data.website && parsed.data.website.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }

  const clinicUrl = normalizeClinicUrl(parsed.data.clinic_url);
  if (!clinicUrl) {
    return NextResponse.json({ error: "Please enter a valid clinic website URL." }, { status: 400 });
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    console.error("[premium] STRIPE_PRICE_ID not set");
    return NextResponse.json({ error: "Payment is temporarily unavailable." }, { status: 500 });
  }

  const variant = parsePaidVariant(parsed.data.variant);
  const { leadSource, thankYouPath } = paidConfig(variant);

  const origin = new URL(req.url).origin;
  try {
    const session = await getStripe().checkout.sessions.create({
      ui_mode: "embedded_page",
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      // Lets a 100%-off promotion code be entered at checkout: the session still
      // completes (payment_status "no_payment_required"), so the conversion
      // tracking on /premium/thank-you can be tested without a real payment.
      // Fulfillment stays untouched — it requires payment_status "paid".
      allow_promotion_codes: true,
      customer_email: parsed.data.email,
      // Stripe emails the receipt automatically on successful payment (live mode).
      payment_intent_data: { receipt_email: parsed.data.email },
      metadata: {
        lead_email: parsed.data.email,
        clinic_type: parsed.data.clinic_type,
        clinic_url: clinicUrl,
        // Read back on fulfillment: which funnel this lead came from.
        lead_source: leadSource,
      },
      return_url: `${origin}${thankYouPath}?session_id={CHECKOUT_SESSION_ID}`,
    });
    return NextResponse.json({ clientSecret: session.client_secret });
  } catch (e) {
    console.error("[premium] checkout session create failed", { error: String(e) });
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 500 });
  }
}
