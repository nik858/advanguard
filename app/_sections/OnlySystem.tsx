"use client";
import { Reveal } from "./_shared/Reveal";
import { CTA } from "./_shared/CTA";
import { Book } from "./_shared/Book";
import { EditRich } from "../_editor/EditRich";
import { RepeatableList } from "../_editor/RepeatableList";
import { MediaSlot } from "../_editor/MediaSlot";
import { Erasable } from "../_editor/Erasable";
import { Resizable } from "../_editor/Resizable";
import type { OnlySystemContent } from "@/types/content";
import { mediaUrl } from "@/types/content";
import { scrollToLeadForm } from "@/lib/landing/scroll-to-lead-form";

export function OnlySystem({ content: c, edit = false, style }: { content: OnlySystemContent; edit?: boolean; style?: React.CSSProperties }) {
  return (
    <section className="ac-only" aria-labelledby="only-h2" style={style}>
      <div className="ac-only__inner">
        <Reveal className="ac-only__header">
          <Erasable path="onlySystem.eyebrow" label="eyebrow" as="span">
            <span className="ac-headline__eyebrow" style={{ ["--dot-color" as string]: c.eyebrowDotColor } as React.CSSProperties}>
              <EditRich edit={edit} path="onlySystem.eyebrow">{c.eyebrow}</EditRich>
            </span>
          </Erasable>
          <Erasable path="onlySystem.h2" label="title">
            <h2 className="ac-only__h2" id="only-h2">
              <EditRich edit={edit} path="onlySystem.h2" multiline>{c.h2}</EditRich>
            </h2>
          </Erasable>
          <Erasable path="onlySystem.body" label="body">
            <p className="ac-only__body">
              <EditRich edit={edit} path="onlySystem.body">{c.body}</EditRich>
            </p>
          </Erasable>
        </Reveal>
        <Reveal className="ac-only__features" delay={120}>
          <div className="ac-only__col ac-only__col--left">
            <RepeatableList path="onlySystem.leftFeatures" newItem={{ title: "New feature", body: "" }} edit={edit}>
            {c.leftFeatures.map((f, i) => (
              <div key={i}>
                <div className="ac-only__feat-title">
                  <EditRich edit={edit} path={`onlySystem.leftFeatures.${i}.title`}>{f.title}</EditRich>
                </div>
                <div className="ac-only__feat-body">
                  <EditRich edit={edit} path={`onlySystem.leftFeatures.${i}.body`}>{f.body}</EditRich>
                </div>
              </div>
            ))}
            </RepeatableList>
          </div>
          <Resizable path="onlySystem.centerImage" label="center image size" className="ac-only__book-stage">
            {mediaUrl(c.centerImage) ? (
              <div style={{ position: "relative" }}>
                <img
                  src={mediaUrl(c.centerImage)}
                  alt={typeof c.centerImage === "object" && c.centerImage ? (c.centerImage.alt ?? "") : ""}
                  className="ac-only__center-img"
                  style={{ maxWidth: "100%", maxHeight: 480, objectFit: "contain", display: "block", margin: "0 auto" }}
                />
                {edit && <MediaSlot path="onlySystem.centerImage" accept="image" compact />}
              </div>
            ) : (
              <>
                <div className="ac-only__papers" aria-hidden={edit ? undefined : "true"}>
                  {[
                    { cls: "ac-only__paper--blue", transform: "translate(-180px,-10px) rotate(-12deg)", defaultTitle: "Build A High Performing Team" },
                    { cls: "ac-only__paper--red",  transform: "translate(-90px,80px) rotate(-30deg)",   defaultTitle: "Automatic Marketing Machine" },
                    { cls: "ac-only__paper--red",  transform: "translate(180px,-10px) rotate(12deg)",   defaultTitle: "7-Figure Digital Business" },
                    { cls: "ac-only__paper--blue", transform: "translate(90px,80px) rotate(30deg)",     defaultTitle: "Build A Community" },
                  ].map((p, i) => (
                    <div key={i} className={`ac-only__paper ${p.cls}`} style={{ transform: p.transform }}>
                      <div className="ac-only__paper-bar"></div>
                      <div className="ac-only__paper-title">
                        <EditRich edit={edit} path={`onlySystem.paperTitles.${i}`}>{c.paperTitles?.[i] ?? p.defaultTitle}</EditRich>
                      </div>
                      <div className="ac-only__paper-body">{Array.from({ length: 9 }).map((_, j) => <div key={j} className="ac-only__paper-line"/>)}</div>
                    </div>
                  ))}
                </div>
                <div className="ac-only__book">
                  <Book
                    title={
                      <EditRich edit={edit} path="onlySystem.bookTitle" multiline>
                        {c.bookTitle ?? "Automatic\nClients"}
                      </EditRich>
                    }
                    quoteLines={[0, 1, 2].map((i) => (
                      <EditRich key={i} edit={edit} path={`onlySystem.bookQuoteLines.${i}`}>
                        {c.bookQuoteLines?.[i] ?? ["Copy & paste automated process", "that allows you to acquire", "customers for free"][i]}
                      </EditRich>
                    ))}
                  />
                </div>
                {edit && <MediaSlot path="onlySystem.centerImage" accept="image" compact />}
              </>
            )}
          </Resizable>
          <div className="ac-only__col ac-only__col--right">
            <RepeatableList path="onlySystem.rightFeatures" newItem={{ title: "New feature", body: "" }} edit={edit}>
            {c.rightFeatures.map((f, i) => (
              <div key={i}>
                <div className="ac-only__feat-title">
                  <EditRich edit={edit} path={`onlySystem.rightFeatures.${i}.title`}>{f.title}</EditRich>
                </div>
                <div className="ac-only__feat-body">
                  <EditRich edit={edit} path={`onlySystem.rightFeatures.${i}.body`}>{f.body}</EditRich>
                </div>
              </div>
            ))}
            </RepeatableList>
          </div>
        </Reveal>
        <Reveal className="ac-only__stats" delay={160}>
          <RepeatableList path="onlySystem.stats" newItem={{ value: "0", label: "Label" }} edit={edit}>
          {c.stats.map((s, i) => (
            <div className="ac-only__stat" key={i}>
              <div className="ac-only__stat-value">
                <EditRich edit={edit} path={`onlySystem.stats.${i}.value`}>{s.value}</EditRich>
              </div>
              <div className="ac-only__stat-label">
                <EditRich edit={edit} path={`onlySystem.stats.${i}.label`}>{s.label}</EditRich>
              </div>
            </div>
          ))}
          </RepeatableList>
        </Reveal>
        <Erasable path="onlySystem.cta" label="CTA">
          <Reveal className="ac-only__cta-wrap" delay={200}>
            <CTA
              edit={edit}
              tag={<EditRich edit={edit} path="onlySystem.ctaTagline">{c.ctaTagline}</EditRich>}
              label={<EditRich edit={edit} path="onlySystem.ctaLabel">{c.ctaLabel}</EditRich>}
              onClick={scrollToLeadForm}
            />
            <Erasable path="onlySystem.ctaSubLink" label="sub link" as="span">
              <a className="ac-only__cta-sub" href="#top" onClick={(e) => { e.preventDefault(); scrollToLeadForm(); }}>
                <EditRich edit={edit} path="onlySystem.ctaSubLink">{c.ctaSubLink}</EditRich>
              </a>
            </Erasable>
            <Erasable path="onlySystem.guaranteeText" label="guarantee text">
              <div className="ac-only__guarantee-row">
                <div className="ac-only__guarantee-text">
                  <EditRich edit={edit} path="onlySystem.guaranteeText">{c.guaranteeText}</EditRich>
                </div>
              </div>
            </Erasable>
          </Reveal>
        </Erasable>
      </div>
    </section>
  );
}
