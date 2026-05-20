import { Reveal } from "./_shared/Reveal";
import { VideoPlayer } from "./_shared/VideoPlayer";
import { OrderForm } from "./OrderForm";
import { EditRich } from "../_editor/EditRich";
import { MediaSlot } from "../_editor/MediaSlot";
import { Erasable } from "../_editor/Erasable";
import { Resizable } from "../_editor/Resizable";
import type { HeroContent, OrderContent } from "@/types/content";

export function Hero({ hero, order, edit = false, style }: { hero: HeroContent; order: OrderContent; edit?: boolean; style?: React.CSSProperties }) {
  return (
    <section className="ac-hero" aria-labelledby="what-is-h2" style={style}>
      <div className="ac-hero__grid">
        <div className="ac-hero__copy">
          <Erasable path="hero.videoUrl" label="hero video">
            <Resizable path="hero.videoUrl" label="hero video size">
              <Reveal className="ac-hero__video-wrap">
                <div className="ac-hero__video" style={{ position: "relative" }}>
                  {edit && <MediaSlot path="hero.videoUrl" accept="video" />}
                  <VideoPlayer src={hero.videoUrl} poster={hero.videoPoster} label={hero.videoLabel} edit={edit}/>
                </div>
                {(edit || (hero.videoLabel ?? "").trim()) && (
                  <Erasable path="hero.videoLabel" label="video label">
                    <p className="ac-hero__video-label">
                      <EditRich edit={edit} path="hero.videoLabel">{hero.videoLabel}</EditRich>
                    </p>
                  </Erasable>
                )}
              </Reveal>
            </Resizable>
          </Erasable>
          <Erasable path="hero.sectionTitle" label="section title">
            <Reveal delay={80}>
              <h2 className="ac-hero__what-h2" id="what-is-h2">
                <EditRich edit={edit} path="hero.sectionTitle">{hero.sectionTitle}</EditRich>
              </h2>
            </Reveal>
          </Erasable>
          <Erasable path="hero.sectionBody" label="section body">
            <Reveal delay={120}>
              <p className="ac-hero__what-body">
                <EditRich edit={edit} path="hero.sectionBody" multiline>{hero.sectionBody}</EditRich>
              </p>
            </Reveal>
          </Erasable>
        </div>
        <Reveal as="aside" className="ac-order-wrap">
          <OrderForm content={order} edit={edit} />
        </Reveal>
      </div>
    </section>
  );
}
