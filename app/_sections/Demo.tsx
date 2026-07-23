import { Reveal } from "./_shared/Reveal";
import { VideoPlayer } from "./_shared/VideoPlayer";
import { Edit } from "../_editor/Edit";
import { EditRich } from "../_editor/EditRich";
import { MediaSlot } from "../_editor/MediaSlot";
import { Erasable } from "../_editor/Erasable";
import { Resizable } from "../_editor/Resizable";
import type { DemoContent } from "@/types/content";

export function Demo({ content: c, edit = false, style }: { content: DemoContent; edit?: boolean; style?: React.CSSProperties }) {
  return (
    <section className="ac-demo" aria-labelledby="demo-h2" style={style}>
      <div className="ac-demo__inner">
        <Erasable path="demo.h2" label="demo title">
          <Reveal>
            <h2 className="ac-demo__h2" id="demo-h2">
              <EditRich edit={edit} path="demo.h2">{c.h2}</EditRich>
            </h2>
          </Reveal>
        </Erasable>
        <Resizable path="demo.videoUrl" label="demo video size">
          <Erasable path="demo.videoUrl" label="demo video">
            <Reveal delay={120}>
              <div className="ac-demo__video" style={{ position: "relative" }}>
                {edit && <MediaSlot path="demo.videoUrl" posterPath="demo.videoPoster" accept="video" />}
                <VideoPlayer src={c.videoUrl} poster={c.videoPoster} label="Demo video" edit={edit}/>
              </div>
            </Reveal>
          </Erasable>
        </Resizable>
      </div>
    </section>
  );
}
