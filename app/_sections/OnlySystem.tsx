"use client";
import { Reveal } from "./_shared/Reveal";
import { CTA } from "./_shared/CTA";
import { Book } from "./_shared/Book";
import { GuaranteeBadge } from "./_shared/GuaranteeBadge";
import { Edit } from "../_editor/Edit";
import type { Content } from "@/types/content";

export function OnlySystem({ content: c, onCheckout, edit = false }: { content: Content["onlySystem"]; onCheckout?: () => void; edit?: boolean }) {
  return (
    <section className="ac-only" aria-labelledby="only-h2">
      <div className="ac-only__inner">
        <Reveal className="ac-only__header">
          <span className="ac-headline__eyebrow" style={{ ["--dot-color" as string]: c.eyebrowDotColor } as React.CSSProperties}>
            <Edit edit={edit} path="onlySystem.eyebrow">{c.eyebrow}</Edit>
          </span>
          <h2 className="ac-only__h2" id="only-h2">
            <Edit edit={edit} path="onlySystem.h2" multiline>{c.h2}</Edit>
          </h2>
          <p className="ac-only__body">
            <Edit edit={edit} path="onlySystem.body">{c.body}</Edit>
          </p>
        </Reveal>
        <Reveal className="ac-only__features" delay={120}>
          <div className="ac-only__col ac-only__col--left">
            {c.leftFeatures.map((f, i) => (
              <div key={i}>
                <div className="ac-only__feat-title">
                  <Edit edit={edit} path={`onlySystem.leftFeatures.${i}.title`}>{f.title}</Edit>
                </div>
                <div className="ac-only__feat-body">
                  <Edit edit={edit} path={`onlySystem.leftFeatures.${i}.body`}>{f.body}</Edit>
                </div>
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
                <div className="ac-only__feat-title">
                  <Edit edit={edit} path={`onlySystem.rightFeatures.${i}.title`}>{f.title}</Edit>
                </div>
                <div className="ac-only__feat-body">
                  <Edit edit={edit} path={`onlySystem.rightFeatures.${i}.body`}>{f.body}</Edit>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal className="ac-only__stats" delay={160}>
          {c.stats.map((s, i) => (
            <div className="ac-only__stat" key={i}>
              <div className="ac-only__stat-value">
                <Edit edit={edit} path={`onlySystem.stats.${i}.value`}>{s.value}</Edit>
              </div>
              <div className="ac-only__stat-label">
                <Edit edit={edit} path={`onlySystem.stats.${i}.label`}>{s.label}</Edit>
              </div>
            </div>
          ))}
        </Reveal>
        <Reveal className="ac-only__cta-wrap" delay={200}>
          <CTA tag={c.ctaTagline} label={c.ctaLabel} onClick={onCheckout}/>
          <a className="ac-only__cta-sub" href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
            <Edit edit={edit} path="onlySystem.ctaSubLink">{c.ctaSubLink}</Edit>
          </a>
          <div className="ac-only__guarantee-row">
            <GuaranteeBadge size={64}/>
            <div className="ac-only__guarantee-text">
              <Edit edit={edit} path="onlySystem.guaranteeText">{c.guaranteeText}</Edit>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
