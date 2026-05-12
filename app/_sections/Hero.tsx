import { Reveal } from "./_shared/Reveal";
import { VideoPlayer } from "./_shared/VideoPlayer";
import { OrderForm } from "./OrderForm";
import { Edit } from "../_editor/Edit";
import type { Content } from "@/types/content";

export function Hero({ hero, order, edit = false }: { hero: Content["hero"]; order: Content["order"]; edit?: boolean }) {
  return (
    <section className="ac-hero" aria-labelledby="what-is-h2">
      <div className="ac-hero__grid">
        <div className="ac-hero__copy">
          <Reveal className="ac-hero__video-wrap">
            <div className="ac-hero__video">
              <VideoPlayer src={hero.videoUrl} poster={hero.videoPoster} label={hero.videoLabel}/>
            </div>
            <p className="ac-hero__video-label">
              <Edit edit={edit} path="hero.videoLabel">{hero.videoLabel}</Edit>
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="ac-hero__what-h2" id="what-is-h2">
              <Edit edit={edit} path="hero.sectionTitle">{hero.sectionTitle}</Edit>
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="ac-hero__what-body">
              <Edit edit={edit} path="hero.sectionBody" multiline>{hero.sectionBody}</Edit>
            </p>
          </Reveal>
        </div>
        <Reveal as="aside" className="ac-order-wrap">
          <OrderForm content={order} edit={edit} />
        </Reveal>
      </div>
    </section>
  );
}
