"use client";
import { Reveal } from "./_shared/Reveal";
import { CTA } from "./_shared/CTA";
import { mediaUrl, type Content } from "@/types/content";

export function Footer({ content: c, header: h, onCheckout }: {
  content: Content["footer"];
  header: Content["header"];
  onCheckout?: () => void;
}) {
  const logoLightUrl = mediaUrl(h.logoLight);
  return (
    <footer className="ac-footer" role="contentinfo">
      <div className="ac-footer__inner">
        <Reveal><p className="ac-footer__disclaimer">{c.disclaimer}</p></Reveal>
        <Reveal delay={80} className="ac-footer__stack">
          <CTA tag={c.ctaTagline} label={c.ctaLabel} onClick={onCheckout}/>
        </Reveal>
        <Reveal delay={160}><p className="ac-footer__earnings">{c.earnings}</p></Reveal>
        <Reveal delay={200}>
          {logoLightUrl
            ? <img src={logoLightUrl} alt="Advanguard" className="ac-footer__logo-img" width={180} height={40}/>
            : <span className="ac-footer__logo">{c.logoText}</span>}
        </Reveal>
        <Reveal delay={240}><p className="ac-footer__copy">{c.copyright}</p></Reveal>
      </div>
    </footer>
  );
}
