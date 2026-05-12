import { Reveal } from "./_shared/Reveal";
import { GuaranteeBadge } from "./_shared/GuaranteeBadge";
import type { Content } from "@/types/content";

export function GuaranteeSection({ content: c }: { content: Content["guarantee"] }) {
  return (
    <section className="ac-guarantee" aria-labelledby="guarantee-h2">
      <div className="ac-guarantee__inner">
        <Reveal><GuaranteeBadge size={124}/></Reveal>
        <Reveal delay={80}><h2 className="ac-guarantee__h2" id="guarantee-h2">{c.h2}</h2></Reveal>
        <Reveal delay={140}><div className="ac-guarantee__body" style={{ whiteSpace: "pre-line" }}>{c.body}</div></Reveal>
      </div>
    </section>
  );
}
