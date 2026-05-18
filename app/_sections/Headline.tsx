import { Reveal } from "./_shared/Reveal";
import { Edit } from "../_editor/Edit";
import { EditRich } from "../_editor/EditRich";
import type { HeadlineContent } from "@/types/content";

export function Headline({ content: c, edit = false }: { content: HeadlineContent; edit?: boolean }) {
  return (
    <section className="ac-headline" id="top">
      <Reveal>
        <span className="ac-headline__eyebrow" style={{ ["--dot-color" as string]: c.eyebrowDotColor } as React.CSSProperties}>
          <EditRich edit={edit} path="headline.eyebrow">{c.eyebrow}</EditRich>
        </span>
      </Reveal>
      <Reveal delay={80}>
        <h1 className="ac-headline__h1">
          <EditRich edit={edit} path="headline.h1" multiline>{c.h1}</EditRich>
        </h1>
      </Reveal>
      <Reveal delay={160}>
        <p className="ac-headline__sub">
          <EditRich edit={edit} path="headline.sub" multiline>{c.sub}</EditRich>
        </p>
      </Reveal>
    </section>
  );
}
