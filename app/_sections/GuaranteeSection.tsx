import { Reveal } from "./_shared/Reveal";
import { Edit } from "../_editor/Edit";
import { EditRich } from "../_editor/EditRich";
import type { GuaranteeContent } from "@/types/content";

export function GuaranteeSection({ content: c, edit = false, style }: { content: GuaranteeContent; edit?: boolean; style?: React.CSSProperties }) {
  return (
    <section className="ac-guarantee" aria-labelledby="guarantee-h2" style={style}>
      <div className="ac-guarantee__inner">
        <Reveal delay={80}>
          <h2 className="ac-guarantee__h2" id="guarantee-h2">
            <EditRich edit={edit} path="guarantee.h2">{c.h2}</EditRich>
          </h2>
        </Reveal>
        <Reveal delay={140}>
          <div className="ac-guarantee__body" style={{ whiteSpace: "pre-line" }}>
            <EditRich edit={edit} path="guarantee.body" multiline>{c.body}</EditRich>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
