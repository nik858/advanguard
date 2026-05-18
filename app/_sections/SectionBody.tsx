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

export function SectionBody({ section, edit = false }: { section: Section; edit?: boolean }) {
  const mt = section.style?.mt;
  const mb = section.style?.mb;
  const wrapperStyle =
    mt !== undefined || mb !== undefined
      ? {
          marginTop: mt !== undefined ? `${mt}px` : undefined,
          marginBottom: mb !== undefined ? `${mb}px` : undefined,
        }
      : undefined;

  let body: ReactNode = null;
  switch (section.type) {
    case "headline":
      body = <Headline content={section.data.headline} edit={edit} />; break;
    case "hero":
      body = <Hero hero={section.data.hero} order={section.data.order} edit={edit} />; break;
    case "authority":
      body = <LogoStrip content={section.data.authority} edit={edit} />; break;
    case "onlySystem":
      body = <OnlySystem content={section.data.onlySystem} edit={edit} />; break;
    case "demo":
      body = <Demo content={section.data.demo} edit={edit} />; break;
    case "testimonials":
      body = <Testimonials content={section.data.testimonials} edit={edit} />; break;
    case "stack":
      body = <Stack content={section.data.stack} edit={edit} />; break;
    case "guarantee":
      body = <GuaranteeSection content={section.data.guarantee} edit={edit} />; break;
    case "faq":
      body = <FAQ content={section.data.faq} edit={edit} />; break;
  }

  return wrapperStyle ? <div style={wrapperStyle}>{body}</div> : <>{body}</>;
}
