import { Icons } from "./_shared/Icons";
import { Edit } from "../_editor/Edit";
import { MediaSlot } from "../_editor/MediaSlot";
import { mediaUrl, type HeaderContent } from "@/types/content";

export function Header({ content: c, edit = false }: { content: HeaderContent; edit?: boolean }) {
  const logoDarkUrl = mediaUrl(c.logoDark);
  const faviconUrl = mediaUrl(c.favicon);
  return (
    <header className="ac-header" role="banner">
      <div className="ac-header__left">
        <span className="ac-header__phone"><Icons.Phone/></span>
        <span><Edit edit={edit} path="header.orderByPhone">{c.orderByPhone}</Edit></span>
      </div>

      {edit ? (
        <div className="ac-header__brand-edit">
          <div className="ac-header__logo-slot" style={{ position: "relative" }}>
            <MediaSlot path="header.logoDark" accept="image" />
            {logoDarkUrl
              ? <img src={logoDarkUrl} alt="Logo" className="ac-header__logo-img" />
              : <span className="ac-header__logo"><Edit edit={edit} path="header.logoText">{c.logoText || "ADVANGUARD"}</Edit></span>}
          </div>
          <div className="ac-header__favicon-slot" style={{ position: "relative" }} title="Browser-tab icon (favicon)">
            <MediaSlot path="header.favicon" accept="image" compact />
            {faviconUrl
              ? <img src={faviconUrl} alt="Favicon" className="ac-header__favicon-img" />
              : <span className="ac-header__favicon-empty">tab icon</span>}
          </div>
        </div>
      ) : (
        <a href="#top" className="ac-header__logo-link" aria-label="Home">
          {logoDarkUrl
            ? <img src={logoDarkUrl} alt="Logo" className="ac-header__logo-img" width={160} height={34}/>
            : <span className="ac-header__logo">{c.logoText || "ADVANGUARD"}</span>}
        </a>
      )}

      <div className="ac-header__right">
        <Edit edit={edit} path="header.needHelp">{c.needHelp}</Edit>
      </div>
    </header>
  );
}
