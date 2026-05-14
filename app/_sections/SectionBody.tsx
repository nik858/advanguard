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
  switch (section.type) {
    case "headline":
      return <Headline content={section.data.headline} edit={edit} />;
    case "hero":
      return <Hero hero={section.data.hero} order={section.data.order} edit={edit} />;
    case "authority":
      return <LogoStrip content={section.data.authority} edit={edit} />;
    case "onlySystem":
      return <OnlySystem content={section.data.onlySystem} edit={edit} />;
    case "demo":
      return <Demo content={section.data.demo} edit={edit} />;
    case "testimonials":
      return <Testimonials content={section.data.testimonials} edit={edit} />;
    case "stack":
      return <Stack content={section.data.stack} edit={edit} />;
    case "guarantee":
      return <GuaranteeSection content={section.data.guarantee} edit={edit} />;
    case "faq":
      return <FAQ content={section.data.faq} edit={edit} />;
  }
}
