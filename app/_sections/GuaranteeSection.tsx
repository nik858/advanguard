import { Reveal } from "./_shared/Reveal";
import { Edit } from "../_editor/Edit";
import { EditRich } from "../_editor/EditRich";
import { Erasable } from "../_editor/Erasable";
import type { GuaranteeContent } from "@/types/content";

export function GuaranteeSection({ content: c, edit = false, style }: { content: GuaranteeContent; edit?: boolean; style?: React.CSSProperties }) {
  return (
    <section className="ac-guarantee" aria-labelledby="guarantee-h2" style={style}>
      <div className="ac-guarantee__inner">
        <Erasable path="guarantee.h2" label="guarantee title">
          <Reveal delay={80}>
            <h2 className="ac-guarantee__h2" id="guarantee-h2">
              <EditRich edit={edit} path="guarantee.h2">{c.h2}</EditRich>
            </h2>
          </Reveal>
        </Erasable>
        <Erasable path="guarantee.body" label="guarantee body">
          <Reveal delay={140}>
            <div className="ac-guarantee__body" style={{ whiteSpace: "pre-line" }}>
              <EditRich edit={edit} path="guarantee.body" multiline>{c.body}</EditRich>
            </div>
          </Reveal>
        </Erasable>
      </div>
    </section>
  );
}
