import { Reveal } from "./_shared/Reveal";
import { Edit } from "../_editor/Edit";
import type { Content } from "@/types/content";

export function LogoStrip({ content: c, edit = false }: { content: Content["authority"]; edit?: boolean }) {
  return (
    <section className="ac-authority" aria-label="Featured in">
      <Reveal>
        <div className="ac-authority__title">
          <Edit edit={edit} path="authority.title">{c.title}</Edit>
        </div>
        <div className="ac-authority__row">
          {c.logos.map((l, i) => (
            <Reveal key={i} delay={i * 80} className="ac-authority__logo">
              <Edit edit={edit} path={`authority.logos.${i}`}>{l}</Edit>
            </Reveal>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
