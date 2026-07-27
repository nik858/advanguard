import type { Metadata } from "next";
import contentJson from "@/content/content.json";
import { migrateContent, findSection } from "@/types/content";
import { Header } from "@/app/_sections/Header";
import { Footer } from "@/app/_sections/Footer";
import { RenderContextProvider } from "@/app/_editor/RenderContext";
import { SectionContextProvider } from "@/app/_editor/SectionContext";
import { LeadGateProvider } from "@/app/_sections/_shared/LeadGate";
import { PremiumSectionBody } from "./_components/PremiumSectionBody";
import { PREMIUM_SUBMITTED_KEY } from "./_components/premium-gate";

// Premium split-test variant of the landing page. Same content.json sections as
// the free page (visual parity for the A/B test), but the order form charges
// $27 via embedded Stripe Checkout before the audit fires.
// noindex: this is a paid-traffic variant — it must not compete with the free
// page in search results.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PremiumHome() {
  const c = migrateContent(contentJson);
  const hero = findSection(c, "hero");

  return (
    <RenderContextProvider value={{ hiddenFields: c.hiddenFields ?? [], imageSizes: c.imageSizes ?? {}, edit: false }}>
      <LeadGateProvider
        storageKey={PREMIUM_SUBMITTED_KEY}
        successMessage={(hero?.data.order.successMessage || "Success. Your Patient-Leak Findings will be emailed in 3-minutes").trim()}
      >
        <Header content={c.header} />
        <main id="main">
          {c.sections
            .filter((s) => !s.hidden)
            .map((s) => (
              <SectionContextProvider key={s.id} value={{ basePath: "", sectionId: s.id }}>
                <PremiumSectionBody section={s} />
              </SectionContextProvider>
            ))}
        </main>
        <Footer content={c.footer} header={c.header} />
      </LeadGateProvider>
    </RenderContextProvider>
  );
}
