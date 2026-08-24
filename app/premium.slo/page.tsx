import type { Metadata } from "next";
import premiumSloContentJson from "@/content/content.premium.slo.json";
import { PremiumLanding } from "../premium/_components/PremiumLanding";

// Second paid landing page, served at /premium.slo for a separate traffic
// channel. Structurally identical to /premium — same $27 offer, same order
// card — but with its own content file, its own draft/Publish and its own
// lead source ("paid_slo"), so the two can be measured apart.
// noindex: paid traffic only, it must not compete in search results.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PremiumSloHome() {
  return <PremiumLanding variant="premium_slo" content={premiumSloContentJson} />;
}
