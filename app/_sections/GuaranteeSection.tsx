import { Reveal } from "./_shared/Reveal";
import { GuaranteeBadge } from "./_shared/GuaranteeBadge";
import { Edit } from "../_editor/Edit";
import type { Content } from "@/types/content";

export function GuaranteeSection({ content: c, edit = false }: { content: Content["guarantee"]; edit?: boolean }) {
  return (
    <section className="ac-guarantee" aria-labelledby="guarantee-h2">
      <div className="ac-guarantee__inner">
        <Reveal><GuaranteeBadge size={124}/></Reveal>
        <Reveal delay={80}>
          <h2 className="ac-guarantee__h2" id="guarantee-h2">
            <Edit edit={edit} path="guarantee.h2">{c.h2}</Edit>
          </h2>
        </Reveal>
        <Reveal delay={140}>
          <div className="ac-guarantee__body" style={{ whiteSpace: "pre-line" }}>
            <Edit edit={edit} path="guarantee.body" multiline>{c.body}</Edit>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
