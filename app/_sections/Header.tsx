import { Icons } from "./_shared/Icons";
import { EditRich } from "../_editor/EditRich";
import { MediaSlot } from "../_editor/MediaSlot";
import { Erasable } from "../_editor/Erasable";
import { mediaUrl, type HeaderContent } from "@/types/content";

export function Header({ content: c, edit = false }: { content: HeaderContent; edit?: boolean }) {
  const logoDarkUrl = mediaUrl(c.logoDark);
  const faviconUrl = mediaUrl(c.favicon);
  return (
    <header className="ac-header" role="banner">
      <Erasable path="header.orderByPhone" label="phone block" as="div" className="ac-header__left">
        <Erasable path="header.phoneIcon" label="phone icon" as="span" className="ac-header__phone">
          <Icons.Phone />
        </Erasable>
        <span><EditRich edit={edit} path="header.orderByPhone">{c.orderByPhone}</EditRich></span>
      </Erasable>

      {edit ? (
        <div className="ac-header__brand-edit">
          <Erasable path="header.logoDark" label="logo">
            <div className="ac-header__logo-slot" style={{ position: "relative" }}>
              <MediaSlot path="header.logoDark" accept="image" />
              {logoDarkUrl
                ? <img src={logoDarkUrl} alt="Logo" className="ac-header__logo-img" />
                : <span className="ac-header__logo"><EditRich edit={edit} path="header.logoText">{c.logoText || "ADVANGUARD"}</EditRich></span>}
            </div>
          </Erasable>
          <Erasable path="header.favicon" label="favicon">
            <div className="ac-header__favicon-slot" style={{ position: "relative" }} title="Browser-tab icon (favicon)">
              <MediaSlot path="header.favicon" accept="image" compact />
              {faviconUrl
                ? <img src={faviconUrl} alt="Favicon" className="ac-header__favicon-img" />
                : <span className="ac-header__favicon-empty">tab icon</span>}
            </div>
          </Erasable>
        </div>
      ) : (
        <a href="#top" className="ac-header__logo-link" aria-label="Home">
          {logoDarkUrl
            ? <img src={logoDarkUrl} alt="Logo" className="ac-header__logo-img" width={160} height={34}/>
            : <span className="ac-header__logo">{c.logoText || "ADVANGUARD"}</span>}
        </a>
      )}

      <Erasable path="header.needHelp" label="help text" as="div" className="ac-header__right">
        <EditRich edit={edit} path="header.needHelp">{c.needHelp}</EditRich>
      </Erasable>
    </header>
  );
}
