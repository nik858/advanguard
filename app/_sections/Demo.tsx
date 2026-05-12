import { Reveal } from "./_shared/Reveal";
import { VideoPlayer } from "./_shared/VideoPlayer";
import type { Content } from "@/types/content";

export function Demo({ content: c }: { content: Content["demo"] }) {
  return (
    <section className="ac-demo" aria-labelledby="demo-h2">
      <div className="ac-demo__inner">
        <Reveal><h2 className="ac-demo__h2" id="demo-h2">{c.h2}</h2></Reveal>
        <Reveal delay={120}>
          <div className="ac-demo__video">
            <VideoPlayer src={c.videoUrl} poster={c.videoPoster} label="Demo video"/>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
