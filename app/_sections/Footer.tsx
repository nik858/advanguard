"use client";
import { Reveal } from "./_shared/Reveal";
import { CTA } from "./_shared/CTA";
import { Edit } from "../_editor/Edit";
import { EditRich } from "../_editor/EditRich";
import { mediaUrl, type FooterContent, type HeaderContent } from "@/types/content";

export function Footer({ content: c, header: h, onCheckout, edit = false }: {
  content: FooterContent;
  header: HeaderContent;
  onCheckout?: () => void;
  edit?: boolean;
}) {
  const logoLightUrl = mediaUrl(h.logoLight);
  return (
    <footer className="ac-footer" role="contentinfo">
      <div className="ac-footer__inner">
        <Reveal>
          <p className="ac-footer__disclaimer">
            <EditRich edit={edit} path="footer.disclaimer" multiline>{c.disclaimer}</EditRich>
          </p>
        </Reveal>
        <Reveal delay={80} className="ac-footer__stack">
          <CTA tag={c.ctaTagline} label={c.ctaLabel} onClick={onCheckout}/>
        </Reveal>
        <Reveal delay={160}>
          <p className="ac-footer__earnings">
            <Edit edit={edit} path="footer.earnings">{c.earnings}</Edit>
          </p>
        </Reveal>
        <Reveal delay={200}>
          {logoLightUrl
            ? <img src={logoLightUrl} alt="Advanguard" className="ac-footer__logo-img" width={180} height={40}/>
            : <span className="ac-footer__logo"><Edit edit={edit} path="footer.logoText">{c.logoText}</Edit></span>}
        </Reveal>
        <Reveal delay={240}>
          <p className="ac-footer__copy">
            <Edit edit={edit} path="footer.copyright">{c.copyright}</Edit>
          </p>
        </Reveal>
      </div>
    </footer>
  );
}
