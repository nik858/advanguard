import type { ReactNode } from "react";
import type { Section } from "@/types/content";
import { Headline } from "./Headline";
import { Hero } from "./Hero";
import { LogoStrip } from "./LogoStrip";
import { OnlySystem } from "./OnlySystem";
import { Demo } from "./Demo";
import { Testimonials } from "./Testimonials";
import { Stack } from "./Stack";
import { GuaranteeSection } from "./GuaranteeSection";
import { FAQ } from "./FAQ";
import { SectionSpacingHandles } from "../_editor/SectionSpacingHandles";

export function SectionBody({ section, edit = false }: { section: Section; edit?: boolean }) {
  const sectionStyle: React.CSSProperties | undefined =
    (section.style?.pt !== undefined || section.style?.pb !== undefined)
      ? {
          paddingTop: section.style.pt !== undefined ? `${section.style.pt}px` : undefined,
          paddingBottom: section.style.pb !== undefined ? `${section.style.pb}px` : undefined,
        }
      : undefined;

  let body: ReactNode = null;
  switch (section.type) {
    case "headline":
      body = <Headline content={section.data.headline} edit={edit} style={sectionStyle} />; break;
    case "hero":
      body = <Hero hero={section.data.hero} order={section.data.order} edit={edit} style={sectionStyle} />; break;
    case "authority":
      body = <LogoStrip content={section.data.authority} edit={edit} style={sectionStyle} />; break;
    case "onlySystem":
      body = <OnlySystem content={section.data.onlySystem} edit={edit} style={sectionStyle} />; break;
    case "demo":
      body = <Demo content={section.data.demo} edit={edit} style={sectionStyle} />; break;
    case "testimonials":
      body = <Testimonials content={section.data.testimonials} edit={edit} style={sectionStyle} />; break;
    case "stack":
      body = <Stack content={section.data.stack} edit={edit} style={sectionStyle} />; break;
    case "guarantee":
      body = <GuaranteeSection content={section.data.guarantee} edit={edit} style={sectionStyle} />; break;
    case "faq":
      body = <FAQ content={section.data.faq} edit={edit} style={sectionStyle} />; break;
  }

  return (
    <div style={{ position: "relative" }}>
      {body}
      {edit && <SectionSpacingHandles sectionId={section.id} currentPt={section.style?.pt} currentPb={section.style?.pb} />}
    </div>
  );
}
