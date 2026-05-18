"use client";
import { Reveal } from "./_shared/Reveal";
import { CTA } from "./_shared/CTA";
import { Book } from "./_shared/Book";
import { Edit } from "../_editor/Edit";
import { EditRich } from "../_editor/EditRich";
import { RepeatableList } from "../_editor/RepeatableList";
import { MediaSlot } from "../_editor/MediaSlot";
import type { OnlySystemContent } from "@/types/content";
import { mediaUrl } from "@/types/content";

export function OnlySystem({ content: c, onCheckout, edit = false, style }: { content: OnlySystemContent; onCheckout?: () => void; edit?: boolean; style?: React.CSSProperties }) {
  return (
    <section className="ac-only" aria-labelledby="only-h2" style={style}>
      <div className="ac-only__inner">
        <Reveal className="ac-only__header">
          <span className="ac-headline__eyebrow" style={{ ["--dot-color" as string]: c.eyebrowDotColor } as React.CSSProperties}>
            <EditRich edit={edit} path="onlySystem.eyebrow">{c.eyebrow}</EditRich>
          </span>
          <h2 className="ac-only__h2" id="only-h2">
            <EditRich edit={edit} path="onlySystem.h2" multiline>{c.h2}</EditRich>
          </h2>
          <p className="ac-only__body">
            <EditRich edit={edit} path="onlySystem.body">{c.body}</EditRich>
          </p>
        </Reveal>
        <Reveal className="ac-only__features" delay={120}>
          <div className="ac-only__col ac-only__col--left">
            <RepeatableList path="onlySystem.leftFeatures" newItem={{ title: "New feature", body: "" }} edit={edit}>
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
            </RepeatableList>
          </div>
          <div className="ac-only__book-stage" style={{ position: "relative" }}>
            {mediaUrl(c.centerImage) ? (
              <>
                <img
                  src={mediaUrl(c.centerImage)}
                  alt={typeof c.centerImage === "object" && c.centerImage ? (c.centerImage.alt ?? "") : ""}
                  className="ac-only__center-img"
                  style={{ maxWidth: "100%", maxHeight: 480, objectFit: "contain", display: "block", margin: "0 auto" }}
                />
                {edit && <MediaSlot path="onlySystem.centerImage" accept="image" compact />}
              </>
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
                        <Edit edit={edit} path={`onlySystem.paperTitles.${i}`}>{c.paperTitles?.[i] ?? p.defaultTitle}</Edit>
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
          </div>
          <div className="ac-only__col ac-only__col--right">
            <RepeatableList path="onlySystem.rightFeatures" newItem={{ title: "New feature", body: "" }} edit={edit}>
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
            </RepeatableList>
          </div>
        </Reveal>
        <Reveal className="ac-only__stats" delay={160}>
          <RepeatableList path="onlySystem.stats" newItem={{ value: "0", label: "Label" }} edit={edit}>
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
          </RepeatableList>
        </Reveal>
        <Reveal className="ac-only__cta-wrap" delay={200}>
          <CTA
            edit={edit}
            tag={<Edit edit={edit} path="onlySystem.ctaTagline">{c.ctaTagline}</Edit>}
            label={<Edit edit={edit} path="onlySystem.ctaLabel">{c.ctaLabel}</Edit>}
            onClick={onCheckout}
          />
          <a className="ac-only__cta-sub" href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
            <Edit edit={edit} path="onlySystem.ctaSubLink">{c.ctaSubLink}</Edit>
          </a>
          <div className="ac-only__guarantee-row">
            <div className="ac-only__guarantee-text">
              <Edit edit={edit} path="onlySystem.guaranteeText">{c.guaranteeText}</Edit>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
