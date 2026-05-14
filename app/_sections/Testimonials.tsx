import { Reveal } from "./_shared/Reveal";
import { VideoPlayer } from "./_shared/VideoPlayer";
import { Stars } from "./_shared/Stars";
import { Edit } from "../_editor/Edit";
import { MediaSlot } from "../_editor/MediaSlot";
import { RepeatableList } from "../_editor/RepeatableList";
import { TestimonialTypeToggle } from "../_editor/TestimonialTypeToggle";
import { mediaUrl, type TestimonialsContent } from "@/types/content";
import type { ReactNode } from "react";

function highlightQuote(quote: string, highlights: string[]): ReactNode {
  if (!highlights || !highlights.length) return quote;
  type Part = { text: string; hl: boolean };
  const parts: Part[] = [{ text: quote, hl: false }];
  for (const h of highlights) {
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.hl) continue;
      const idx = p.text.toLowerCase().indexOf(h.toLowerCase());
      if (idx >= 0) {
        const before = p.text.slice(0, idx);
        const match = p.text.slice(idx, idx + h.length);
        const after = p.text.slice(idx + h.length);
        parts.splice(i, 1, { text: before, hl: false }, { text: match, hl: true }, { text: after, hl: false });
        break;
      }
    }
  }
  return parts.map((p, i) => p.hl ? <span className="ac-testi-card__hl" key={i}>{p.text}</span> : <span key={i}>{p.text}</span>);
}

export function Testimonials({ content: c, edit = false }: { content: TestimonialsContent; edit?: boolean }) {
  return (
    <section className="ac-testi" aria-labelledby="testi-h2">
      <div className="ac-testi__inner">
        <Reveal className="ac-testi__head">
          <div className="ac-testi__rating">
            <span className="ac-testi__rating-text">
              <Edit edit={edit} path="testimonials.rating">{c.rating}</Edit>
            </span>
            <span className="ac-testi__rating-stars" aria-label="5 out of 5"><Stars/></span>
          </div>
          <h2 className="ac-testi__h2" id="testi-h2">
            <Edit edit={edit} path="testimonials.h2">{c.h2}</Edit>
          </h2>
          <p className="ac-testi__pull">
            <Edit edit={edit} path="testimonials.pullQuote">{c.pullQuote}</Edit>
          </p>
        </Reveal>
        <div className="ac-testi__grid">
          <RepeatableList
            path="testimonials.items"
            newItem={{ type: "text", avatar: "", name: "Name", role: "Role", quote: "New testimonial quote.", highlights: [] }}
            edit={edit}
          >
          {c.items.map((t, i) => (
            <Reveal className="ac-testi__card" key={i} delay={(i % 3) * 80}>
              {edit && <TestimonialTypeToggle path={`testimonials.items.${i}`} current={t.type} />}
              {t.type === "video" ? (
                <div className="ac-testi-card ac-testi-card--video" style={{ position: "relative" }}>
                  {edit && <MediaSlot path={`testimonials.items.${i}.videoUrl`} accept="video" />}
                  <VideoPlayer src={t.videoUrl} poster={t.videoPoster} label={t.name} edit={edit}/>
                  <div className="ac-testi-card__video-foot">
                    <div className="ac-testi-card__name">
                      <Edit edit={edit} path={`testimonials.items.${i}.name`}>{t.name}</Edit>
                    </div>
                    <div className="ac-testi-card__role">
                      <Edit edit={edit} path={`testimonials.items.${i}.role`}>{t.role}</Edit>
                    </div>
                    <div className="ac-testi-card__video-quote">&quot;<Edit edit={edit} path={`testimonials.items.${i}.quote`} multiline>{t.quote}</Edit>&quot;</div>
                  </div>
                </div>
              ) : (
                <div className="ac-testi-card">
                  <div className="ac-testi-card__head">
                    {edit ? (
                      <div className="ac-testi-card__avatar-slot" style={{ position: "relative" }}>
                        <MediaSlot path={`testimonials.items.${i}.avatar`} accept="image" />
                        <div className="ac-testi-card__avatar" style={{ backgroundImage: `url(${mediaUrl(t.avatar)})` }} aria-hidden="true"/>
                      </div>
                    ) : (
                      <div className="ac-testi-card__avatar" style={{ backgroundImage: `url(${mediaUrl(t.avatar)})` }} aria-hidden="true"/>
                    )}
                    <div>
                      <div className="ac-testi-card__name">
                        <Edit edit={edit} path={`testimonials.items.${i}.name`}>{t.name}</Edit>
                      </div>
                      <div className="ac-testi-card__role">
                        <Edit edit={edit} path={`testimonials.items.${i}.role`}>{t.role}</Edit>
                      </div>
                    </div>
                  </div>
                  <div className="ac-testi-card__stars" aria-label="5 stars"><Stars/></div>
                  <p className="ac-testi-card__quote">
                    {edit
                      ? <Edit edit={edit} path={`testimonials.items.${i}.quote`} multiline>{t.quote}</Edit>
                      : highlightQuote(t.quote, t.highlights)}
                  </p>
                </div>
              )}
            </Reveal>
          ))}
          </RepeatableList>
        </div>
      </div>
    </section>
  );
}
