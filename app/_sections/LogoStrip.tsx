import { Reveal } from "./_shared/Reveal";
import { Edit } from "../_editor/Edit";
import { MediaSlot } from "../_editor/MediaSlot";
import { RepeatableList } from "../_editor/RepeatableList";
import { mediaUrl, type AuthorityContent } from "@/types/content";

/** A logo is an uploaded image. Legacy string labels (pre-image migration) are
 *  not URLs — coerce them to empty so they render as an empty slot, not a
 *  broken <img>. */
function logoSrc(logo: AuthorityContent["logos"][number]): string {
  const url = mediaUrl(logo);
  return /^(https?:\/\/|\/)/.test(url) ? url : "";
}
function logoAlt(logo: AuthorityContent["logos"][number]): string {
  return typeof logo === "object" && logo ? (logo.alt ?? "") : "";
}

export function LogoStrip({ content: c, edit = false }: { content: AuthorityContent; edit?: boolean }) {
  return (
    <section className="ac-authority" aria-label="Featured in">
      <Reveal>
        <div className="ac-authority__title">
          <Edit edit={edit} path="authority.title">{c.title}</Edit>
        </div>
        <div className="ac-authority__row">
          <RepeatableList path="authority.logos" newItem={{ url: "", alt: "" }} edit={edit}>
          {c.logos.map((logo, i) => {
            const src = logoSrc(logo);
            if (edit) {
              return (
                <Reveal key={i} delay={i * 80} className="ac-authority__logo">
                  <div className="ac-authority__logo-slot" style={{ position: "relative" }}>
                    <MediaSlot path={`authority.logos.${i}`} accept="image" />
                    {src
                      ? <img className="ac-authority__logo-img" src={src} alt={logoAlt(logo)} />
                      : <span className="ac-authority__logo-empty">Logo</span>}
                  </div>
                </Reveal>
              );
            }
            if (!src) return null;
            return (
              <Reveal key={i} delay={i * 80} className="ac-authority__logo">
                <img className="ac-authority__logo-img" src={src} alt={logoAlt(logo)} />
              </Reveal>
            );
          })}
          </RepeatableList>
        </div>
      </Reveal>
    </section>
  );
}
