"use client";
import { Reveal } from "./_shared/Reveal";
import { CTA } from "./_shared/CTA";
import { Book } from "./_shared/Book";
import { Icons } from "./_shared/Icons";
import { EditRich } from "../_editor/EditRich";
import { MediaSlot } from "../_editor/MediaSlot";
import { RepeatableList } from "../_editor/RepeatableList";
import { Erasable } from "../_editor/Erasable";
import { Resizable } from "../_editor/Resizable";
import { mediaUrl, type StackContent } from "@/types/content";
import { scrollToLeadForm } from "@/lib/landing/scroll-to-lead-form";

function shortLabel(s: string): string { return s.split(" ").slice(0, 2).join(" "); }

export function Stack({ content: c, edit = false, style }: { content: StackContent; edit?: boolean; style?: React.CSSProperties }) {
  return (
    <section className="ac-stack" aria-labelledby="stack-h2" style={style}>
      <div className="ac-stack__inner">
        <Erasable path="stack.h2" label="title">
          <Reveal>
            <h2 className="ac-stack__h2" id="stack-h2">
              <EditRich edit={edit} path="stack.h2">{c.h2}</EditRich>
            </h2>
          </Reveal>
        </Erasable>
        <Erasable path="stack.bigStackImg" label="big stack image">
          <Resizable path="stack.bigStackImg" label="image size">
            <Reveal delay={120}>
              <div style={{ position: "relative" }}>
                {edit && <MediaSlot path="stack.bigStackImg" accept="image" />}
                <img className="ac-stack__hero-img" src={mediaUrl(c.bigStackImg)} alt="Everything you're getting in the bundle" width={800} height={334} loading="lazy" decoding="async"/>
              </div>
            </Reveal>
          </Resizable>
        </Erasable>
        <div className="ac-stack__grid">
          <RepeatableList
            path="stack.items"
            newItem={{ kind: "book", image: "", title: "New item", sub: "", body: "", access: "Instant Access", priceWas: "", priceNow: "Free" }}
            edit={edit}
          >
          {c.items.map((it, i) => (
            <Reveal key={i} delay={(i % 3) * 80}>
              <div className="ac-stack-card">
                <Erasable path={`stack.items.${i}.image`} label="card image">
                  <div className="ac-stack-card__visual" style={edit ? { position: "relative" } : undefined}>
                    {edit && <MediaSlot path={`stack.items.${i}.image`} accept="image" />}
                    {mediaUrl(it.image)
                      ? <img className="ac-stack-card__img" src={mediaUrl(it.image)} alt={it.title} />
                      : it.kind === "book"
                        ? <Book size="sm" />
                        : <div className="ac-stack-card__ipad" aria-hidden="true"><div className="ac-stack-card__ipad-label">{shortLabel(it.title)}</div></div>}
                  </div>
                </Erasable>
                <div className="ac-stack-card__title-block">
                  <Erasable path={`stack.items.${i}.title`} label="card title">
                    <div className="ac-stack-card__title">
                      <EditRich edit={edit} path={`stack.items.${i}.title`}>{it.title}</EditRich>
                    </div>
                  </Erasable>
                  <Erasable path={`stack.items.${i}.sub`} label="card subtitle">
                    <div className="ac-stack-card__sub">
                      <EditRich edit={edit} path={`stack.items.${i}.sub`}>{it.sub}</EditRich>
                    </div>
                  </Erasable>
                </div>
                <Erasable path={`stack.items.${i}.body`} label="card body">
                  <p className="ac-stack-card__body">
                    <EditRich edit={edit} path={`stack.items.${i}.body`} multiline>{it.body}</EditRich>
                  </p>
                </Erasable>
                <div className="ac-stack-card__foot">
                  <Erasable path={`stack.items.${i}.access`} label="access" as="span">
                    <span className="ac-stack-card__access"><Icons.Download/><EditRich edit={edit} path={`stack.items.${i}.access`}>{it.access}</EditRich></span>
                  </Erasable>
                  <Erasable path={`stack.items.${i}.price`} label="price" as="span">
                    <span className="ac-stack-card__price">
                      <span className="ac-stack-card__price-was">Price: <EditRich edit={edit} path={`stack.items.${i}.priceWas`}>{it.priceWas}</EditRich></span>
                      <span className="ac-stack-card__price-now">
                        <EditRich edit={edit} path={`stack.items.${i}.priceNow`}>{it.priceNow}</EditRich>
                      </span>
                    </span>
                  </Erasable>
                </div>
              </div>
            </Reveal>
          ))}
          </RepeatableList>
        </div>
        <Erasable path="stack.cta" label="CTA">
          <Reveal className="ac-only__cta-wrap" delay={200}>
            <CTA
              edit={edit}
              tag={<EditRich edit={edit} path="stack.ctaTagline">{c.ctaTagline}</EditRich>}
              label={<EditRich edit={edit} path="stack.ctaLabel">{c.ctaLabel}</EditRich>}
              onClick={scrollToLeadForm}
            />
            <Erasable path="stack.guaranteeText" label="guarantee text">
              <div className="ac-only__guarantee-row">
                <div className="ac-only__guarantee-text">
                  <EditRich edit={edit} path="stack.guaranteeText">{c.guaranteeText}</EditRich>
                </div>
              </div>
            </Erasable>
          </Reveal>
        </Erasable>
      </div>
    </section>
  );
}
