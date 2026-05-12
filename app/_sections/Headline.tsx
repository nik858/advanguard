import { Reveal } from "./_shared/Reveal";
import type { Content } from "@/types/content";

export function Headline({ content: c }: { content: Content["headline"] }) {
  return (
    <section className="ac-headline" id="top">
      <Reveal>
        <span className="ac-headline__eyebrow" style={{ ["--dot-color" as string]: c.eyebrowDotColor } as React.CSSProperties}>{c.eyebrow}</span>
      </Reveal>
      <Reveal delay={80}>
        <h1 className="ac-headline__h1">{c.h1}</h1>
      </Reveal>
      <Reveal delay={160}>
        <p className="ac-headline__sub">{c.sub}</p>
      </Reveal>
    </section>
  );
}
