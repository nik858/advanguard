import { Reveal } from "./_shared/Reveal";
import { Edit } from "../_editor/Edit";
import { EditRich } from "../_editor/EditRich";
import { Erasable } from "../_editor/Erasable";
import type { HeadlineContent } from "@/types/content";

export function Headline({ content: c, edit = false, style }: { content: HeadlineContent; edit?: boolean; style?: React.CSSProperties }) {
  return (
    <section className="ac-headline" id="top" style={style}>
      <Erasable path="headline.eyebrow" label="eyebrow">
        <Reveal>
          <span className="ac-headline__eyebrow" style={{ ["--dot-color" as string]: c.eyebrowDotColor } as React.CSSProperties}>
            <Erasable path="headline.eyebrowDot" label="dot" as="span" className="ac-headline__eyebrow-dot">{null}</Erasable>
            <span className="ac-headline__eyebrow-text">
              <EditRich edit={edit} path="headline.eyebrow">{c.eyebrow}</EditRich>
            </span>
          </span>
        </Reveal>
      </Erasable>
      <Erasable path="headline.h1" label="headline">
        <Reveal delay={80}>
          <h1 className="ac-headline__h1">
            <EditRich edit={edit} path="headline.h1" multiline>{c.h1}</EditRich>
          </h1>
        </Reveal>
      </Erasable>
      <Erasable path="headline.sub" label="subtitle">
        <Reveal delay={160}>
          <p className="ac-headline__sub">
            <EditRich edit={edit} path="headline.sub" multiline>{c.sub}</EditRich>
          </p>
        </Reveal>
      </Erasable>
    </section>
  );
}
