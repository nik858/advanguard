"use client";
import { Reveal } from "./_shared/Reveal";
import { CTA } from "./_shared/CTA";
import { Book } from "./_shared/Book";
import { GuaranteeBadge } from "./_shared/GuaranteeBadge";
import type { Content } from "@/types/content";

export function OnlySystem({ content: c, onCheckout }: { content: Content["onlySystem"]; onCheckout?: () => void }) {
  return (
    <section className="ac-only" aria-labelledby="only-h2">
      <div className="ac-only__inner">
        <Reveal className="ac-only__header">
          <span className="ac-headline__eyebrow" style={{ ["--dot-color" as string]: c.eyebrowDotColor } as React.CSSProperties}>{c.eyebrow}</span>
          <h2 className="ac-only__h2" id="only-h2">{c.h2}</h2>
          <p className="ac-only__body">{c.body}</p>
        </Reveal>
        <Reveal className="ac-only__features" delay={120}>
          <div className="ac-only__col ac-only__col--left">
            {c.leftFeatures.map((f, i) => (
              <div key={i}>
                <div className="ac-only__feat-title">{f.title}</div>
                <div className="ac-only__feat-body">{f.body}</div>
              </div>
            ))}
          </div>
          <div className="ac-only__book-stage">
            <div className="ac-only__papers" aria-hidden="true">
              <div className="ac-only__paper ac-only__paper--blue" style={{ transform: "translate(-180px,-10px) rotate(-12deg)" }}><div className="ac-only__paper-bar"></div><div className="ac-only__paper-title">Build A High Performing Team</div><div className="ac-only__paper-body">{Array.from({ length: 9 }).map((_,i) => <div key={i} className="ac-only__paper-line"/>)}</div></div>
              <div className="ac-only__paper ac-only__paper--red"  style={{ transform: "translate(-90px,80px) rotate(-30deg)" }}><div className="ac-only__paper-bar"></div><div className="ac-only__paper-title">Automatic Marketing Machine</div><div className="ac-only__paper-body">{Array.from({ length: 9 }).map((_,i) => <div key={i} className="ac-only__paper-line"/>)}</div></div>
              <div className="ac-only__paper ac-only__paper--red"  style={{ transform: "translate(180px,-10px) rotate(12deg)" }}><div className="ac-only__paper-bar"></div><div className="ac-only__paper-title">7-Figure Digital Business</div><div className="ac-only__paper-body">{Array.from({ length: 9 }).map((_,i) => <div key={i} className="ac-only__paper-line"/>)}</div></div>
              <div className="ac-only__paper ac-only__paper--blue" style={{ transform: "translate(90px,80px) rotate(30deg)" }}><div className="ac-only__paper-bar"></div><div className="ac-only__paper-title">Build A Community</div><div className="ac-only__paper-body">{Array.from({ length: 9 }).map((_,i) => <div key={i} className="ac-only__paper-line"/>)}</div></div>
            </div>
            <div className="ac-only__book"><Book/></div>
          </div>
          <div className="ac-only__col ac-only__col--right">
            {c.rightFeatures.map((f, i) => (
              <div key={i}>
                <div className="ac-only__feat-title">{f.title}</div>
                <div className="ac-only__feat-body">{f.body}</div>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal className="ac-only__stats" delay={160}>
          {c.stats.map((s, i) => (
            <div className="ac-only__stat" key={i}>
              <div className="ac-only__stat-value">{s.value}</div>
              <div className="ac-only__stat-label">{s.label}</div>
            </div>
          ))}
        </Reveal>
        <Reveal className="ac-only__cta-wrap" delay={200}>
          <CTA tag={c.ctaTagline} label={c.ctaLabel} onClick={onCheckout}/>
          <a className="ac-only__cta-sub" href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{c.ctaSubLink}</a>
          <div className="ac-only__guarantee-row">
            <GuaranteeBadge size={64}/>
            <div className="ac-only__guarantee-text">{c.guaranteeText}</div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
