"use client";
import { Reveal } from "./_shared/Reveal";
import { LeadCTA } from "./_shared/LeadCTA";
import { EditRich } from "../_editor/EditRich";
import { EditableText } from "../_editor/EditableText";
import { Erasable } from "../_editor/Erasable";
import { mediaUrl, type FooterContent, type HeaderContent } from "@/types/content";

export function Footer({ content: c, header: h, edit = false }: {
  content: FooterContent;
  header: HeaderContent;
  edit?: boolean;
}) {
  const logoLightUrl = mediaUrl(h.logoLight);
  return (
    <footer className="ac-footer" role="contentinfo">
      <div className="ac-footer__inner">
        <Erasable path="footer.disclaimer" label="disclaimer">
          <Reveal>
            <p className="ac-footer__disclaimer">
              <EditRich edit={edit} path="footer.disclaimer" multiline>{c.disclaimer}</EditRich>
            </p>
          </Reveal>
        </Erasable>
        <Erasable path="footer.cta" label="footer CTA">
          <Reveal delay={80} className="ac-footer__stack">
            <LeadCTA
              edit={edit}
              tag={<EditRich edit={edit} path="footer.ctaTagline">{c.ctaTagline}</EditRich>}
              label={<EditRich edit={edit} path="footer.ctaLabel">{c.ctaLabel}</EditRich>}
            />
          </Reveal>
        </Erasable>
        <Erasable path="footer.earnings" label="earnings">
          <Reveal delay={160}>
            <p className="ac-footer__earnings">
              <EditRich edit={edit} path="footer.earnings">{c.earnings}</EditRich>
            </p>
          </Reveal>
        </Erasable>
        <Erasable path="footer.logoText" label="footer logo">
          <Reveal delay={200}>
            {logoLightUrl
              ? <img src={logoLightUrl} alt="Advanguard" className="ac-footer__logo-img" width={180} height={40}/>
              : <span className="ac-footer__logo"><EditRich edit={edit} path="footer.logoText">{c.logoText}</EditRich></span>}
          </Reveal>
        </Erasable>
        <Erasable path="footer.copyright" label="copyright">
          <Reveal delay={240}>
            <p className="ac-footer__copy">
              <EditRich edit={edit} path="footer.copyright">{c.copyright}</EditRich>
            </p>
          </Reveal>
        </Erasable>
        <Erasable path="footer.privacyUrl" label="privacy link">
          <Reveal delay={260}>
            {edit ? (
              <p className="ac-footer__privacy" style={{ fontSize: 12, color: "#a1a1aa" }}>
                <span style={{ marginRight: 8 }}>Privacy URL:</span>
                <EditableText path="footer.privacyUrl" as="span">
                  {c.privacyUrl || "(paste URL here)"}
                </EditableText>
                <span style={{ margin: "0 8px" }}>·</span>
                <EditableText path="footer.privacyLabel" as="span">
                  {c.privacyLabel || "Privacy Policy"}
                </EditableText>
              </p>
            ) : (
              c.privacyUrl ? (
                <p className="ac-footer__privacy">
                  <a href={c.privacyUrl} target="_blank" rel="noreferrer noopener" className="ac-footer__privacy-link">
                    {c.privacyLabel || "Privacy Policy"}
                  </a>
                </p>
              ) : null
            )}
          </Reveal>
        </Erasable>
      </div>
    </footer>
  );
}
