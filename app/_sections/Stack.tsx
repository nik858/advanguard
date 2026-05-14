"use client";
import { Reveal } from "./_shared/Reveal";
import { CTA } from "./_shared/CTA";
import { Book } from "./_shared/Book";
import { GuaranteeBadge } from "./_shared/GuaranteeBadge";
import { Icons } from "./_shared/Icons";
import { Edit } from "../_editor/Edit";
import { MediaSlot } from "../_editor/MediaSlot";
import { RepeatableList } from "../_editor/RepeatableList";
import { mediaUrl, type StackContent } from "@/types/content";

function shortLabel(s: string): string { return s.split(" ").slice(0, 2).join(" "); }

export function Stack({ content: c, onCheckout, edit = false }: { content: StackContent; onCheckout?: () => void; edit?: boolean }) {
  return (
    <section className="ac-stack" aria-labelledby="stack-h2">
      <div className="ac-stack__inner">
        <Reveal>
          <h2 className="ac-stack__h2" id="stack-h2">
            <Edit edit={edit} path="stack.h2">{c.h2}</Edit>
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <div style={{ position: "relative" }}>
            {edit && <MediaSlot path="stack.bigStackImg" accept="image" />}
            <img className="ac-stack__hero-img" src={mediaUrl(c.bigStackImg)} alt="Everything you're getting in the bundle" width={800} height={334} loading="lazy" decoding="async"/>
          </div>
        </Reveal>
        <div className="ac-stack__grid">
          <RepeatableList
            path="stack.items"
            newItem={{ kind: "book", title: "New item", sub: "", body: "", access: "Instant Access", priceWas: "", priceNow: "Free" }}
            edit={edit}
          >
          {(i) => {
            const it = c.items[i];
            return (
            <Reveal key={i} delay={(i % 3) * 80}>
              <div className="ac-stack-card">
                <div className="ac-stack-card__visual">
                  {it.kind === "book"
                    ? <Book size="sm" />
                    : <div className="ac-stack-card__ipad" aria-hidden="true"><div className="ac-stack-card__ipad-label">{shortLabel(it.title)}</div></div>}
                </div>
                <div className="ac-stack-card__title-block">
                  <div className="ac-stack-card__title">
                    <Edit edit={edit} path={`stack.items.${i}.title`}>{it.title}</Edit>
                  </div>
                  <div className="ac-stack-card__sub">
                    <Edit edit={edit} path={`stack.items.${i}.sub`}>{it.sub}</Edit>
                  </div>
                </div>
                <p className="ac-stack-card__body">
                  <Edit edit={edit} path={`stack.items.${i}.body`} multiline>{it.body}</Edit>
                </p>
                <div className="ac-stack-card__foot">
                  <span className="ac-stack-card__access"><Icons.Download/><Edit edit={edit} path={`stack.items.${i}.access`}>{it.access}</Edit></span>
                  <span className="ac-stack-card__price">
                    <span className="ac-stack-card__price-was">Price: <Edit edit={edit} path={`stack.items.${i}.priceWas`}>{it.priceWas}</Edit></span>
                    <span className="ac-stack-card__price-now">
                      <Edit edit={edit} path={`stack.items.${i}.priceNow`}>{it.priceNow}</Edit>
                    </span>
                  </span>
                </div>
              </div>
            </Reveal>
            );
          }}
          </RepeatableList>
        </div>
        <Reveal className="ac-only__cta-wrap" delay={200}>
          <CTA tag={c.ctaTagline} label={c.ctaLabel} onClick={onCheckout}/>
          <div className="ac-only__guarantee-row">
            <GuaranteeBadge size={64}/>
            <div className="ac-only__guarantee-text">
              <Edit edit={edit} path="stack.guaranteeText">{c.guaranteeText}</Edit>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
