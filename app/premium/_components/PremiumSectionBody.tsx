import type { Section } from "@/types/content";
import { SectionBody } from "@/app/_sections/SectionBody";
import { SectionSpacingHandles } from "@/app/_editor/SectionSpacingHandles";
import { PremiumHero } from "./PremiumHero";

// Renders the same sections as the free page, swapping only the hero so the
// premium order form (Stripe Checkout) replaces the free lead form. Every other
// section delegates to the shared SectionBody untouched.
export function PremiumSectionBody({ section, edit = false }: { section: Section; edit?: boolean }) {
  if (section.type === "hero") {
    const sectionStyle: React.CSSProperties | undefined =
      (section.style?.pt !== undefined || section.style?.pb !== undefined)
        ? {
            paddingTop: section.style.pt !== undefined ? `${section.style.pt}px` : undefined,
            paddingBottom: section.style.pb !== undefined ? `${section.style.pb}px` : undefined,
          }
        : undefined;
    return (
      <div style={{ position: "relative" }}>
        <PremiumHero hero={section.data.hero} order={section.data.order} edit={edit} style={sectionStyle} />
        {edit && <SectionSpacingHandles sectionId={section.id} currentPt={section.style?.pt} currentPb={section.style?.pb} />}
      </div>
    );
  }
  return <SectionBody section={section} edit={edit} />;
}
