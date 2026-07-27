import { Reveal } from "@/app/_sections/_shared/Reveal";
import { VideoPlayer } from "@/app/_sections/_shared/VideoPlayer";
import { EditRich } from "@/app/_editor/EditRich";
import { Erasable } from "@/app/_editor/Erasable";
import { Resizable } from "@/app/_editor/Resizable";
import { PremiumOrderForm } from "./PremiumOrderForm";
import type { HeroContent, OrderContent } from "@/types/content";

// Premium variant of Hero: identical markup, but mounts PremiumOrderForm instead of
// the free OrderForm. Never rendered in edit mode (/premium is not editable).
export function PremiumHero({ hero, order, style }: { hero: HeroContent; order: OrderContent; style?: React.CSSProperties }) {
  return (
    <section className="ac-hero" aria-labelledby="what-is-h2" style={style}>
      <div className="ac-hero__grid">
        <div className="ac-hero__copy">
          <Resizable path="hero.videoUrl" label="hero video size">
            <Erasable path="hero.videoUrl" label="hero video">
              <Reveal className="ac-hero__video-wrap">
                <div className="ac-hero__video" style={{ position: "relative" }}>
                  <VideoPlayer src={hero.videoUrl} poster={hero.videoPoster} label={hero.videoLabel} edit={false} priority />
                </div>
                {(hero.videoLabel ?? "").trim() && (
                  <Erasable path="hero.videoLabel" label="video label">
                    <p className="ac-hero__video-label">
                      <EditRich edit={false} path="hero.videoLabel">{hero.videoLabel}</EditRich>
                    </p>
                  </Erasable>
                )}
              </Reveal>
            </Erasable>
          </Resizable>
          <Erasable path="hero.sectionTitle" label="section title">
            <Reveal delay={80}>
              <h2 className="ac-hero__what-h2" id="what-is-h2">
                <EditRich edit={false} path="hero.sectionTitle">{hero.sectionTitle}</EditRich>
              </h2>
            </Reveal>
          </Erasable>
          <Erasable path="hero.sectionBody" label="section body">
            <Reveal delay={120}>
              <p className="ac-hero__what-body">
                <EditRich edit={false} path="hero.sectionBody" multiline>{hero.sectionBody}</EditRich>
              </p>
            </Reveal>
          </Erasable>
        </div>
        <Reveal as="div" className="ac-order-wrap">
          <PremiumOrderForm content={order} />
        </Reveal>
      </div>
    </section>
  );
}
