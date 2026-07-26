import { NextResponse, after } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { fulfillPaidCheckout } from "@/lib/paid/fulfill";

// Primary fulfillment path for the paid funnel: Stripe calls this on
// checkout.session.completed, so the audit fires even if the buyer closes the
// tab before landing on /paid/thank-you. Fulfillment is idempotent (unique
// stripe_session_id), so racing with the thank-you page is safe.

// The audit runs in the background via after(); give the function room to finish.
export const maxDuration = 300;

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  // Raw body required — any parsing before signature verification breaks it.
  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch (e) {
    console.error("[paid] webhook signature verification failed", { error: String(e) });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    after(async () => {
      const result = await fulfillPaidCheckout(session);
      console.log("[paid] webhook fulfillment", { sessionId: session.id, result });
    });
  }

  return NextResponse.json({ received: true });
}
