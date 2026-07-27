import type { Metadata } from "next";
import { headers } from "next/headers";
import premiumContentJson from "@/content/content.premium.json";
import { migrateContent, findSection } from "@/types/content";
import { Header } from "@/app/_sections/Header";
import { Footer } from "@/app/_sections/Footer";
import { EditorProvider } from "@/app/_editor/EditorProvider";
import { LandingTree } from "@/app/_editor/LandingTree";
import { RenderContextProvider } from "@/app/_editor/RenderContext";
import { SectionContextProvider } from "@/app/_editor/SectionContext";
import { LeadGateProvider } from "@/app/_sections/_shared/LeadGate";
import { PremiumSectionBody } from "./_components/PremiumSectionBody";
import { PREMIUM_SUBMITTED_KEY } from "./_components/premium-gate";

// Premium split-test variant of the landing page. It has its own content file
// (content/content.premium.json), its own draft and its own Publish, so its
// copy can diverge from the free page freely.
// noindex: this is a paid-traffic variant — it must not compete with the free
// page in search results.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PremiumHome() {
  const h = await headers();
  const editMode = h.get("x-adv-edit-mode") === "1";
  const c = migrateContent(premiumContentJson);
  const hero = findSection(c, "hero");

  if (editMode) {
    return (
      <EditorProvider initial={c} variant="premium">
        <LandingTree />
      </EditorProvider>
    );
  }

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
