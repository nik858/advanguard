import { Reveal } from "./_shared/Reveal";
import { Icons } from "./_shared/Icons";
import type { Content } from "@/types/content";

export function FAQ({ content: c }: { content: Content["faq"] }) {
  return (
    <section className="ac-faq" aria-labelledby="faq-h2">
      <div className="ac-faq__inner">
        <Reveal className="ac-faq__head">
          <h2 className="ac-faq__h2" id="faq-h2">{c.h2}</h2>
          <p className="ac-faq__sub">{c.sub}</p>
        </Reveal>
        <div className="ac-faq__grid">
          {c.items.map((q, i) => (
            <Reveal className="ac-faq__item" key={i} delay={(i % 2) * 80}>
              <div className="ac-faq__q">
                <span className="ac-faq__q-icon" aria-hidden="true"><Icons.Question/></span>
                <span className="ac-faq__q-text">{q.q}</span>
              </div>
              <p className="ac-faq__a">{q.a}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
