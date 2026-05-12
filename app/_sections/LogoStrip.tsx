import { Reveal } from "./_shared/Reveal";
import type { Content } from "@/types/content";

export function LogoStrip({ content: c }: { content: Content["authority"] }) {
  return (
    <section className="ac-authority" aria-label="Featured in">
      <Reveal>
        <div className="ac-authority__title">{c.title}</div>
        <div className="ac-authority__row">
          {c.logos.map((l, i) => (
            <Reveal key={i} delay={i * 80} className="ac-authority__logo">{l}</Reveal>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
