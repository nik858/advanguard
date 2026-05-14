import { Reveal } from "./_shared/Reveal";
import { Icons } from "./_shared/Icons";
import { Edit } from "../_editor/Edit";
import type { FaqContent } from "@/types/content";

export function FAQ({ content: c, edit = false }: { content: FaqContent; edit?: boolean }) {
  return (
    <section className="ac-faq" aria-labelledby="faq-h2">
      <div className="ac-faq__inner">
        <Reveal className="ac-faq__head">
          <h2 className="ac-faq__h2" id="faq-h2">
            <Edit edit={edit} path="faq.h2">{c.h2}</Edit>
          </h2>
          <p className="ac-faq__sub">
            <Edit edit={edit} path="faq.sub">{c.sub}</Edit>
          </p>
        </Reveal>
        <div className="ac-faq__grid">
          {c.items.map((q, i) => (
            <Reveal className="ac-faq__item" key={i} delay={(i % 2) * 80}>
              <div className="ac-faq__q">
                <span className="ac-faq__q-icon" aria-hidden="true"><Icons.Question/></span>
                <span className="ac-faq__q-text">
                  <Edit edit={edit} path={`faq.items.${i}.q`}>{q.q}</Edit>
                </span>
              </div>
              <p className="ac-faq__a">
                <Edit edit={edit} path={`faq.items.${i}.a`} multiline>{q.a}</Edit>
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
