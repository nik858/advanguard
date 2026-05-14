import { Reveal } from "./_shared/Reveal";
import { Edit } from "../_editor/Edit";
import type { HeadlineContent } from "@/types/content";

export function Headline({ content: c, edit = false }: { content: HeadlineContent; edit?: boolean }) {
  return (
    <section className="ac-headline" id="top">
      <Reveal>
        <span className="ac-headline__eyebrow" style={{ ["--dot-color" as string]: c.eyebrowDotColor } as React.CSSProperties}>
          <Edit edit={edit} path="headline.eyebrow">{c.eyebrow}</Edit>
        </span>
      </Reveal>
      <Reveal delay={80}>
        <h1 className="ac-headline__h1">
          <Edit edit={edit} path="headline.h1" multiline>{c.h1}</Edit>
        </h1>
      </Reveal>
      <Reveal delay={160}>
        <p className="ac-headline__sub">
          <Edit edit={edit} path="headline.sub" multiline>{c.sub}</Edit>
        </p>
      </Reveal>
    </section>
  );
}
