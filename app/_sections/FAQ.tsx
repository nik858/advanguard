import { Reveal } from "./_shared/Reveal";
import { Icons } from "./_shared/Icons";
import { EditRich } from "../_editor/EditRich";
import { RepeatableList } from "../_editor/RepeatableList";
import { Erasable } from "../_editor/Erasable";
import type { FaqContent } from "@/types/content";

export function FAQ({ content: c, edit = false, style }: { content: FaqContent; edit?: boolean; style?: React.CSSProperties }) {
  return (
    <section className="ac-faq" aria-labelledby="faq-h2" style={style}>
      <div className="ac-faq__inner">
        <Erasable path="faq.head" label="FAQ header">
          <Reveal className="ac-faq__head">
            <Erasable path="faq.h2" label="FAQ title" as="span">
              <h2 className="ac-faq__h2" id="faq-h2">
                <EditRich edit={edit} path="faq.h2">{c.h2}</EditRich>
              </h2>
            </Erasable>
            <Erasable path="faq.sub" label="FAQ subtitle" as="span">
              <p className="ac-faq__sub">
                <EditRich edit={edit} path="faq.sub">{c.sub}</EditRich>
              </p>
            </Erasable>
          </Reveal>
        </Erasable>
        <div className="ac-faq__grid">
          <RepeatableList path="faq.items" newItem={{ q: "New question?", a: "Answer." }} edit={edit}>
          {c.items.map((q, i) => (
            <Reveal className="ac-faq__item" key={i} delay={(i % 2) * 80}>
              <div className="ac-faq__q">
                <Erasable path={`faq.items.${i}.qIcon`} label="question icon" as="span">
                  <span className="ac-faq__q-icon" aria-hidden="true"><Icons.Question/></span>
                </Erasable>
                <span className="ac-faq__q-text">
                  <EditRich edit={edit} path={`faq.items.${i}.q`}>{q.q}</EditRich>
                </span>
              </div>
              <Erasable path={`faq.items.${i}.a`} label="answer">
                <p className="ac-faq__a">
                  <EditRich edit={edit} path={`faq.items.${i}.a`} multiline>{q.a}</EditRich>
                </p>
              </Erasable>
            </Reveal>
          ))}
          </RepeatableList>
        </div>
      </div>
    </section>
  );
}
