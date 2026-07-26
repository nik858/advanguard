import { Reveal } from "./_shared/Reveal";
import { VideoPlayer } from "./_shared/VideoPlayer";
import { OrderForm } from "./OrderForm";
import { EditRich } from "../_editor/EditRich";
import { MediaSlot } from "../_editor/MediaSlot";
import { Erasable } from "../_editor/Erasable";
import { Resizable } from "../_editor/Resizable";
import { mediaUrl, type HeroContent, type OrderContent } from "@/types/content";

export function Hero({ hero, order, edit = false, style }: { hero: HeroContent; order: OrderContent; edit?: boolean; style?: React.CSSProperties }) {
  return (
    <section className="ac-hero" aria-labelledby="what-is-h2" style={style}>
      <div className="ac-hero__grid">
        <div className="ac-hero__copy">
          <Resizable path="hero.videoUrl" label="hero video size">
            <Erasable path="hero.videoUrl" label="hero video">
              <Reveal className="ac-hero__video-wrap">
                <div className="ac-hero__video" style={{ position: "relative" }}>
                  {edit && <MediaSlot path="hero.videoUrl" posterPath="hero.videoPoster" accept="video" />}
                  <VideoPlayer src={hero.videoUrl} poster={hero.videoPoster} label={hero.videoLabel} edit={edit} priority/>
                </div>
                {(edit || (hero.videoLabel ?? "").trim()) && (
                  <Erasable path="hero.videoLabel" label="video label">
                    <p className="ac-hero__video-label">
                      <EditRich edit={edit} path="hero.videoLabel">{hero.videoLabel}</EditRich>
                    </p>
                  </Erasable>
                )}
              </Reveal>
            </Erasable>
          </Resizable>
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
          {(edit || mediaUrl(hero.sectionImage)) && (
            <Resizable path="hero.sectionImage" label="section image size">
              <Erasable path="hero.sectionImage" label="section image">
                <Reveal delay={140}>
                  <div style={{ position: "relative", marginTop: 18 }}>
                    {mediaUrl(hero.sectionImage) && (
                      <img
                        src={mediaUrl(hero.sectionImage)}
                        alt={typeof hero.sectionImage === "object" && hero.sectionImage ? (hero.sectionImage.alt ?? "") : ""}
                        style={{ width: "100%", height: "auto", borderRadius: 12, display: "block" }}
                      />
                    )}
                    {edit && <MediaSlot path="hero.sectionImage" accept="image" />}
                  </div>
                </Reveal>
              </Erasable>
            </Resizable>
          )}
          {(edit || (hero.sectionBody2 ?? "").trim()) && (
            <Erasable path="hero.sectionBody2" label="section body (below image)">
              <Reveal delay={160}>
                <p className="ac-hero__what-body">
                  <EditRich edit={edit} path="hero.sectionBody2" multiline>{hero.sectionBody2}</EditRich>
                </p>
              </Reveal>
            </Erasable>
          )}
        </div>
        <Reveal as="div" className="ac-order-wrap">
          <OrderForm content={order} edit={edit} />
        </Reveal>
      </div>
    </section>
  );
}
