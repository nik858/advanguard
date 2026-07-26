import type { Section } from "@/types/content";
import { SectionBody } from "@/app/_sections/SectionBody";
import { PaidHero } from "./PaidHero";

// Renders the same sections as the free page, swapping only the hero so the
// paid order form (Stripe Checkout) replaces the free lead form. Every other
// section delegates to the shared SectionBody untouched.
export function PaidSectionBody({ section }: { section: Section }) {
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
        <PaidHero hero={section.data.hero} order={section.data.order} style={sectionStyle} />
      </div>
    );
  }
  return <SectionBody section={section} />;
}
