import { Icons } from "./_shared/Icons";
import { Edit } from "../_editor/Edit";
import { mediaUrl, type Content } from "@/types/content";

export function Header({ content: c, edit = false }: { content: Content["header"]; edit?: boolean }) {
  const logoDarkUrl = mediaUrl(c.logoDark);
  return (
    <header className="ac-header" role="banner">
      <div className="ac-header__left">
        <span className="ac-header__phone"><Icons.Phone/></span>
        <span><Edit edit={edit} path="header.orderByPhone">{c.orderByPhone}</Edit></span>
      </div>
      <a href="#top" className="ac-header__logo-link" aria-label="Advanguard home">
        {logoDarkUrl
          ? <img src={logoDarkUrl} alt="Advanguard" className="ac-header__logo-img" width={160} height={34}/>
          : <span className="ac-header__logo"><Edit edit={edit} path="header.logoText">{c.logoText || "ADVANGUARD"}</Edit></span>}
      </a>
      <div className="ac-header__right">
        <Edit edit={edit} path="header.needHelp">{c.needHelp}</Edit>
      </div>
    </header>
  );
}
