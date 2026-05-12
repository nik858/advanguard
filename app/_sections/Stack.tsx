"use client";
import { Reveal } from "./_shared/Reveal";
import { CTA } from "./_shared/CTA";
import { Book } from "./_shared/Book";
import { GuaranteeBadge } from "./_shared/GuaranteeBadge";
import { Icons } from "./_shared/Icons";
import { mediaUrl, type Content } from "@/types/content";

function shortLabel(s: string): string { return s.split(" ").slice(0, 2).join(" "); }

export function Stack({ content: c, onCheckout }: { content: Content["stack"]; onCheckout?: () => void }) {
  return (
    <section className="ac-stack" aria-labelledby="stack-h2">
      <div className="ac-stack__inner">
        <Reveal><h2 className="ac-stack__h2" id="stack-h2">{c.h2}</h2></Reveal>
        <Reveal delay={120}>
          <img className="ac-stack__hero-img" src={mediaUrl(c.bigStackImg)} alt="Everything you're getting in the Automatic Clients bundle" width={800} height={334} loading="lazy" decoding="async"/>
        </Reveal>
        <div className="ac-stack__grid">
          {c.items.map((it, i) => (
            <Reveal key={i} delay={(i % 3) * 80}>
              <div className="ac-stack-card">
                <div className="ac-stack-card__visual">
                  {it.kind === "book"
                    ? <Book size="sm" />
                    : <div className="ac-stack-card__ipad" aria-hidden="true"><div className="ac-stack-card__ipad-label">{shortLabel(it.title)}</div></div>}
                </div>
                <div className="ac-stack-card__title-block">
                  <div className="ac-stack-card__title">{it.title}</div>
                  <div className="ac-stack-card__sub">{it.sub}</div>
                </div>
                <p className="ac-stack-card__body">{it.body}</p>
                <div className="ac-stack-card__foot">
                  <span className="ac-stack-card__access"><Icons.Download/>{it.access}</span>
                  <span className="ac-stack-card__price">
                    <span className="ac-stack-card__price-was">Price: {it.priceWas}</span>
                    <span className="ac-stack-card__price-now">{it.priceNow}</span>
                  </span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal className="ac-only__cta-wrap" delay={200}>
          <CTA tag={c.ctaTagline} label={c.ctaLabel} onClick={onCheckout}/>
          <div className="ac-only__guarantee-row">
            <GuaranteeBadge size={64}/>
            <div className="ac-only__guarantee-text">{c.guaranteeText}</div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
