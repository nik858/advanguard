import type { Metadata } from "next";
import premiumContentJson from "@/content/content.premium.json";
import { PremiumLanding } from "./_components/PremiumLanding";

// Premium split-test variant of the landing page. It has its own content file
// (content/content.premium.json), its own draft and its own Publish, so its
// copy can diverge from the free page freely.
// noindex: this is a paid-traffic variant — it must not compete with the free
// page in search results.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PremiumHome() {
  return <PremiumLanding variant="premium" content={premiumContentJson} />;
}
