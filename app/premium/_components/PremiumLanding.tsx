import { headers } from "next/headers";
import { migrateContent, findSection } from "@/types/content";
import { Header } from "@/app/_sections/Header";
import { Footer } from "@/app/_sections/Footer";
import { EditorProvider } from "@/app/_editor/EditorProvider";
import { LandingTree } from "@/app/_editor/LandingTree";
import { RenderContextProvider } from "@/app/_editor/RenderContext";
import { SectionContextProvider } from "@/app/_editor/SectionContext";
import { LeadGateProvider } from "@/app/_sections/_shared/LeadGate";
import { paidConfig, type PaidVariant } from "@/lib/landing/variants";
import { PremiumSectionBody } from "./PremiumSectionBody";

// Shared body of every paid landing page (/premium, /premium.slo). Each route
// owns its content file and its variant id; everything else — edit mode, the
// order card, the per-page lead gate — is identical by construction, so the
// pages can never drift apart structurally while their copy diverges freely.

export async function PremiumLanding({
  variant,
  content,
}: {
  variant: PaidVariant;
  content: unknown;
}) {
  const h = await headers();
  const editMode = h.get("x-adv-edit-mode") === "1";
  const c = migrateContent(content);
  const hero = findSection(c, "hero");

  if (editMode) {
    return (
      <EditorProvider initial={c} variant={variant}>
        <LandingTree />
      </EditorProvider>
    );
  }

  return (
    <RenderContextProvider
      value={{ hiddenFields: c.hiddenFields ?? [], imageSizes: c.imageSizes ?? {}, edit: false, checkoutVariant: variant }}
    >
      <LeadGateProvider
        storageKey={paidConfig(variant).gateKey}
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
