import type Stripe from "stripe";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { migrateContent, findSection } from "@/types/content";
import { Header } from "@/app/_sections/Header";
import { Footer } from "@/app/_sections/Footer";
import { RenderContextProvider } from "@/app/_editor/RenderContext";
import { LeadGateProvider } from "@/app/_sections/_shared/LeadGate";
import { getStripe } from "@/lib/stripe";
import { fulfillPremiumCheckout } from "@/lib/premium/fulfill";
import { paidConfig, VARIANTS, type PaidVariant } from "@/lib/landing/variants";
import { MarkPremiumSubmitted } from "./MarkPremiumSubmitted";

// Return page of the embedded Stripe Checkout, shared by every paid landing
// page. Verifies the session directly with Stripe (never trusts the URL
// alone), then fires the audit in the background — idempotently, so the
// webhook racing us is harmless. Each paid page mounts it on its own route so
// the conversion can be triggered per funnel in GTM.

export async function PremiumThankYou({
  variant,
  sessionId,
  content,
}: {
  variant: PaidVariant;
  sessionId: string | undefined;
  content: unknown;
}) {
  const landingPath = VARIANTS[variant].path;
  if (!sessionId) redirect(landingPath);

  let session: Stripe.Checkout.Session | null = null;
  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId);
  } catch (e) {
    console.warn("[premium] thank-you: could not retrieve session", { sessionId, error: String(e) });
  }
  // Unpaid / abandoned / bogus session: back to the paid page, user can retry.
  if (!session || session.status !== "complete") redirect(landingPath);

  const premiumSession = session;
  after(async () => {
    const result = await fulfillPremiumCheckout(premiumSession);
    console.log("[premium] thank-you fulfillment", { sessionId: premiumSession.id, variant, result });
  });

  const c = migrateContent(content);
  const hero = findSection(c, "hero");
  const successMessage = (hero?.data.order.successMessage || "Success. Your Patient-Leak Findings will be emailed in 3-minutes").trim();
  const buyerEmail = premiumSession.customer_details?.email ?? premiumSession.customer_email ?? "";

  return (
    <RenderContextProvider value={{ hiddenFields: c.hiddenFields ?? [], imageSizes: c.imageSizes ?? {}, edit: false }}>
      <LeadGateProvider storageKey={paidConfig(variant).gateKey} successMessage={successMessage}>
        <MarkPremiumSubmitted />
        <Header content={c.header} />
        <main id="main">
          <section style={{ maxWidth: 640, margin: "0 auto", padding: "88px 24px 120px", textAlign: "center" }}>
            <div
              aria-hidden="true"
              style={{
                width: 64,
                height: 64,
                margin: "0 auto 24px",
                borderRadius: "50%",
                background: "#e8f5e9",
                color: "#2e7d32",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 style={{ fontSize: 32, lineHeight: 1.2, marginBottom: 16 }}>Payment confirmed. Thank you!</h1>
            <p style={{ fontSize: 17, lineHeight: 1.6, marginBottom: 12 }} role="status" aria-live="polite">
              {successMessage}
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: "#71717a" }}>
              {buyerEmail
                ? <>Your findings and your Stripe receipt are on their way to <strong>{buyerEmail}</strong>.</>
                : <>Your findings and your Stripe receipt are on their way to your inbox.</>}
              {" "}No further action needed.
            </p>
          </section>
        </main>
        <Footer content={c.footer} header={c.header} />
      </LeadGateProvider>
    </RenderContextProvider>
  );
}
