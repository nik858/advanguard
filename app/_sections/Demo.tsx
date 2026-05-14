import { Reveal } from "./_shared/Reveal";
import { VideoPlayer } from "./_shared/VideoPlayer";
import { Edit } from "../_editor/Edit";
import { MediaSwapButton } from "../_editor/MediaSwapButton";
import type { Content } from "@/types/content";

export function Demo({ content: c, edit = false }: { content: Content["demo"]; edit?: boolean }) {
  return (
    <section className="ac-demo" aria-labelledby="demo-h2">
      <div className="ac-demo__inner">
        <Reveal>
          <h2 className="ac-demo__h2" id="demo-h2">
            <Edit edit={edit} path="demo.h2">{c.h2}</Edit>
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <div className="ac-demo__video" style={{ position: "relative" }}>
            {edit && <MediaSwapButton path="demo.videoUrl" accept="video" allowUrl />}
            <VideoPlayer src={c.videoUrl} poster={c.videoPoster} label="Vidéo de démonstration"/>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
