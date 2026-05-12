import { Icons } from "./_shared/Icons";
import { mediaUrl, type Content } from "@/types/content";

export function Header({ content: c }: { content: Content["header"] }) {
  const logoDarkUrl = mediaUrl(c.logoDark);
  return (
    <header className="ac-header" role="banner">
      <div className="ac-header__left">
        <span className="ac-header__phone"><Icons.Phone/></span>
        <span>{c.orderByPhone}</span>
      </div>
      <a href="#top" className="ac-header__logo-link" aria-label="Advanguard home">
        {logoDarkUrl
          ? <img src={logoDarkUrl} alt="Advanguard" className="ac-header__logo-img" width={160} height={34}/>
          : <span className="ac-header__logo">{c.logoText || "ADVANGUARD"}</span>}
      </a>
      <div className="ac-header__right">{c.needHelp}</div>
    </header>
  );
}
