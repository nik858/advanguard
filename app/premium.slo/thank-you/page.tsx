import type { Metadata } from "next";
import premiumSloContentJson from "@/content/content.premium.slo.json";
import { PremiumThankYou } from "../../premium/_components/PremiumThankYou";

// The audit runs via after(); give the function room to finish.
export const maxDuration = 300;

export const metadata: Metadata = {
  title: "Payment confirmed — Booking Leak",
  robots: { index: false, follow: false },
};

export default async function SloThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  // Header and footer follow this page's own content, so editing the SLO
  // landing keeps its confirmation page in step.
  return <PremiumThankYou variant="premium_slo" sessionId={sessionId} content={premiumSloContentJson} />;
}
