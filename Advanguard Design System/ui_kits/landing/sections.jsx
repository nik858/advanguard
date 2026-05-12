/* Advanguard Landing — React sections.
 * Each section reads from window.AC.content (or live state via useContent hook).
 * Wrapped in an IIFE; components export to window for the entry script to mount.
 */
(function () {
const { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext, Fragment } = React;

/* ─── Content hook: reads window.AC.content, updates on ac:content event ─── */
const ContentCtx = createContext(null);
function ContentProvider({ children }) {
  const [content, setContent] = useState(() => window.AC.content);
  useEffect(() => {
    const onChange = (e) => setContent(e.detail);
    window.addEventListener("ac:content", onChange);
    return () => window.removeEventListener("ac:content", onChange);
  }, []);
  return React.createElement(ContentCtx.Provider, { value: content }, children);
}
const useContent = () => useContext(ContentCtx);

/* ─── Reveal-on-scroll wrapper ─── */
function Reveal({ as = "div", delay = 0, className = "", style = {}, children, ...rest }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) { setShown(true); io.disconnect(); }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  const Tag = as;
  return (
    <Tag ref={ref} className={`reveal ${shown ? "in" : ""} ${className}`} style={{ ...style, transitionDelay: `${delay}ms` }} {...rest}>
      {children}
    </Tag>
  );
}

/* ─── Icons (Phosphor / Remix-style inline SVGs) ─── */
const Icons = {
  Phone: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 22a18 18 0 0 1-18-18c0-1.1.9-2 2-2h3a1 1 0 0 1 1 .76l1 4.24a1 1 0 0 1-.3 1L7.4 9.4a14 14 0 0 0 7.2 7.2l1.4-1.3a1 1 0 0 1 1-.3l4.24 1a1 1 0 0 1 .76 1V20a2 2 0 0 1-2 2"/></svg>,
  ArrowRight: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 5l7 7-7 7-1.4-1.4 4.6-4.6H3v-2h14.2L12.6 6.4z"/></svg>,
  Play: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>,
  Download: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 8 7-8m-7 16v-2H5v2h14v-2h-7Z"/></svg>,
  Question: () => <svg viewBox="0 0 256 256" fill="currentColor"><path d="M128 24a104 104 0 1 0 104 104A104.12 104.12 0 0 0 128 24m0 192a88 88 0 1 1 88-88 88.1 88.1 0 0 1-88 88m12-60a12 12 0 1 1-12-12 12 12 0 0 1 12 12m36-72c0 22.06-20 32-32 32a8 8 0 0 1-8-8c0-9.66 10.34-16 16-16a16 16 0 1 0-16-16 8 8 0 0 1-16 0 32 32 0 1 1 64 8Z"/></svg>,
  Star: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.3 5.82 21l1.64-7.03L2 9.24l7.19-.61L12 2l2.81 6.63 7.19.61-5.46 4.73L18.18 21z"/></svg>,
  Edit: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"/></svg>,
  Close: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>,
  Chevron: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>,
};

/* ─── 5-star rating ─── */
function Stars({ count = 5 }) {
  return Array.from({ length: count }).map((_, i) =>
    <Icons.Star key={i} />
  );
}

/* ─── Inline book cover ─── */
function Book({ size = "lg", title = "Automatic Clients", quoteLines = ["Copy & paste automated process", "that allows you to acquire", "customers for free"] }) {
  const [w1, w2] = title.split(/\s/);
  return (
    <div className={`ac-book ${size === "sm" ? "ac-book--sm" : ""}`} aria-hidden="true">
      <div className="ac-book__title">{w1}<br/>{w2}</div>
      <div className="ac-book__bolt">⚡</div>
      <div className="ac-book__placeholder">
        <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M21 5v14H3V5h18m0-2H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2m-5 5.5a1.5 1.5 0 1 0 1.5 1.5 1.5 1.5 0 0 0-1.5-1.5M5 17l3.5-4.5 2.5 3 3.5-4.5L19 17H5"/></svg>
      </div>
      <div className="ac-book__quote">{quoteLines.map((l, i) => <span key={i}>{l}</span>)}</div>
      <div className="ac-book__binding"></div>
    </div>
  );
}

/* ─── Guarantee badge ─── */
function GuaranteeBadge({ size = 124 }) {
  return (
    <div className="ac-badge" style={{ width: size, height: size }}>
      <div className="ac-badge__star" style={{ width: "100%", height: "100%" }}></div>
      <div className="ac-badge__pct" style={{ fontSize: size * 0.18 }}>100%</div>
    </div>
  );
}

/* ─── Video player (poster → click → embed or HTML5 video) ─── */
function isYouTube(u) { return /youtube\.com\/watch|youtu\.be\//.test(u || ""); }
function isVimeo(u)   { return /vimeo\.com\//.test(u || ""); }
function youTubeId(u) { const m = (u||"").match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/); return m ? m[1] : ""; }
function vimeoId(u)   { const m = (u||"").match(/vimeo\.com\/(\d+)/); return m ? m[1] : ""; }

function VideoPlayer({ src, poster, label }) {
  const [playing, setPlaying] = useState(false);
  const onActivate = useCallback(() => { if (src) setPlaying(true); }, [src]);
  const onKey = useCallback((e) => { if ((e.key === "Enter" || e.key === " ") && src) { e.preventDefault(); setPlaying(true); } }, [src]);

  if (!playing) {
    return (
      <div className="ac-player" role="button" tabIndex={src ? 0 : -1} aria-label={label || "Play video"} onClick={onActivate} onKeyDown={onKey}>
        <img className="ac-player__poster" src={poster} alt={label || "Video preview"} loading="lazy" decoding="async" width="1280" height="720" />
        <div className="ac-player__play"><div className="ac-player__play-icon"><Icons.Play/></div></div>
      </div>
    );
  }
  if (isYouTube(src)) {
    return <iframe src={`https://www.youtube.com/embed/${youTubeId(src)}?autoplay=1&rel=0`} title={label || "Video"} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />;
  }
  if (isVimeo(src)) {
    return <iframe src={`https://player.vimeo.com/video/${vimeoId(src)}?autoplay=1`} title={label || "Video"} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />;
  }
  return <video src={src} poster={poster} controls autoPlay playsInline />;
}

/* ─── Primary CTA ─── */
function CTA({ tag, label, compact = false, ariaLabel, onClick }) {
  return (
    <button className={`ac-cta ${compact ? "ac-cta--compact" : ""}`} type="button" onClick={onClick} aria-label={ariaLabel || label}>
      {tag && <span className="ac-cta__tag">{tag}</span>}
      <span className="ac-cta__label">{label}<span className="ac-cta__arrow"><Icons.ArrowRight/></span></span>
    </button>
  );
}

/* ─── HEADER ─── */
function Header() {
  const c = useContent().header;
  return (
    <header className="ac-header" role="banner">
      <div className="ac-header__left">
        <span className="ac-header__phone"><Icons.Phone/></span>
        <span>{c.orderByPhone}</span>
      </div>
      <a href="#top" className="ac-header__logo-link" aria-label="Advanguard home">
        {c.logoDark
          ? <img src={c.logoDark} alt="Advanguard" className="ac-header__logo-img" width="160" height="34"/>
          : <span className="ac-header__logo">{c.logoText || "ADVANGUARD"}</span>}
      </a>
      <div className="ac-header__right">{c.needHelp}</div>
    </header>
  );
}

/* ─── HEADLINE ─── */
function Headline() {
  const c = useContent().headline;
  return (
    <section className="ac-headline" id="top">
      <Reveal>
        <span className="ac-headline__eyebrow" style={{ "--dot-color": c.eyebrowDotColor }}>{c.eyebrow}</span>
      </Reveal>
      <Reveal delay={80}>
        <h1 className="ac-headline__h1">{c.h1}</h1>
      </Reveal>
      <Reveal delay={160}>
        <p className="ac-headline__sub">{c.sub}</p>
      </Reveal>
    </section>
  );
}

/* ─── HERO (video + "What is" copy + sticky order form) ─── */
function Hero({ onCheckout }) {
  const { hero, order } = useContent();
  return (
    <section className="ac-hero" aria-labelledby="what-is-h2">
      <div className="ac-hero__grid">
        <div className="ac-hero__copy">
          <Reveal className="ac-hero__video-wrap">
            <div className="ac-hero__video">
              <VideoPlayer src={hero.videoUrl} poster={hero.videoPoster} label={hero.videoLabel}/>
            </div>
            <p className="ac-hero__video-label">{hero.videoLabel}</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="ac-hero__what-h2" id="what-is-h2">{hero.sectionTitle}</h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="ac-hero__what-body">{hero.sectionBody}</p>
          </Reveal>
        </div>
        <Reveal as="aside" className="ac-order" aria-label="Order form">
          <div className="ac-order__strip">{order.badge}</div>
          <div className="ac-order__product">
            <div className="ac-order__product-name">{order.productName}</div>
            <div className="ac-order__product-sub">{order.productSubtitle}</div>
          </div>
          <div className="ac-order__inner">
            <div className="ac-order__limited">{order.limitedTime}</div>
            <div className="ac-order__price-row">
              <div>
                <span className="ac-order__price-was">{order.priceWas}</span>
                <span className="ac-order__price">{order.priceNow}</span>
              </div>
              <div className="ac-order__price-sub">{order.priceSubLine}</div>
            </div>
            <p className="ac-order__desc">{order.description}</p>
            <form onSubmit={(e) => { e.preventDefault(); onCheckout && onCheckout(); }} aria-label="Order">
              <label htmlFor="email" className="visually-hidden" style={{ position:"absolute", left:-9999 }}>Email</label>
              <input id="email" type="email" required placeholder="Enter your email" className="ac-order__field" autoComplete="email" />
              <div style={{ height: 9 }}/>
              <label htmlFor="phone" className="visually-hidden" style={{ position:"absolute", left:-9999 }}>Phone</label>
              <input id="phone" type="tel" placeholder="Phone number (for bonuses)" className="ac-order__field" autoComplete="tel" />
              <div style={{ height: 12 }}/>
              <CTA tag={order.ctaTagline} label={order.ctaLabel} />
            </form>
            <div className="ac-order__secure">
              <span className="ac-order__check" aria-hidden="true">✓</span>
              <span>{order.secureText}</span>
            </div>
            <div className="ac-order__guarantee-row">
              <GuaranteeBadge size={64}/>
              <div className="ac-order__guarantee-text">{order.guaranteeText}</div>
            </div>
            <div className="ac-order__rating">
              <span className="ac-order__rating-text">{order.ratingText}</span>
              <span className="ac-order__rating-stars" aria-label="5 out of 5 stars"><Stars/></span>
            </div>
            <div className="ac-order__mini-testimonials">
              {order.miniTestimonials.map((t, i) => (
                <div className="ac-order__mini-card" key={i}>
                  <div className="ac-order__mini-avatar" style={{ backgroundImage: `url(${t.avatar})` }} aria-hidden="true"/>
                  <div>
                    <div className="ac-order__mini-name">{t.name}</div>
                    <div className="ac-order__mini-role">{t.role}</div>
                    <div className="ac-order__mini-quote">"{t.quote}"</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── AUTHORITY LOGOS ─── */
function LogoStrip() {
  const c = useContent().authority;
  return (
    <section className="ac-authority" aria-label="Featured in">
      <Reveal>
        <div className="ac-authority__title">{c.title}</div>
        <div className="ac-authority__row">
          {c.logos.map((l, i) => (
            <Reveal key={i} delay={i * 80} className="ac-authority__logo">{l}</Reveal>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ─── ONLY SYSTEM ─── */
function OnlySystem({ onCheckout }) {
  const c = useContent().onlySystem;
  return (
    <section className="ac-only" aria-labelledby="only-h2">
      <div className="ac-only__inner">
        <Reveal className="ac-only__header">
          <span className="ac-headline__eyebrow" style={{ "--dot-color": c.eyebrowDotColor }}>{c.eyebrow}</span>
          <h2 className="ac-only__h2" id="only-h2">{c.h2}</h2>
          <p className="ac-only__body">{c.body}</p>
        </Reveal>
        <Reveal className="ac-only__features" delay={120}>
          <div className="ac-only__col ac-only__col--left">
            {c.leftFeatures.map((f, i) => (
              <div key={i}>
                <div className="ac-only__feat-title">{f.title}</div>
                <div className="ac-only__feat-body">{f.body}</div>
              </div>
            ))}
          </div>
          <div className="ac-only__book-stage">
            <div className="ac-only__papers" aria-hidden="true">
              <div className="ac-only__paper ac-only__paper--blue" style={{ transform: "translate(-180px,-10px) rotate(-12deg)" }}><div className="ac-only__paper-bar"></div><div className="ac-only__paper-title">Build A High Performing Team</div><div className="ac-only__paper-body">{Array.from({ length: 9 }).map((_,i) => <div key={i} className="ac-only__paper-line"/>)}</div></div>
              <div className="ac-only__paper ac-only__paper--red"  style={{ transform: "translate(-90px,80px) rotate(-30deg)" }}><div className="ac-only__paper-bar"></div><div className="ac-only__paper-title">Automatic Marketing Machine</div><div className="ac-only__paper-body">{Array.from({ length: 9 }).map((_,i) => <div key={i} className="ac-only__paper-line"/>)}</div></div>
              <div className="ac-only__paper ac-only__paper--red"  style={{ transform: "translate(180px,-10px) rotate(12deg)" }}><div className="ac-only__paper-bar"></div><div className="ac-only__paper-title">7-Figure Digital Business</div><div className="ac-only__paper-body">{Array.from({ length: 9 }).map((_,i) => <div key={i} className="ac-only__paper-line"/>)}</div></div>
              <div className="ac-only__paper ac-only__paper--blue" style={{ transform: "translate(90px,80px) rotate(30deg)" }}><div className="ac-only__paper-bar"></div><div className="ac-only__paper-title">Build A Community</div><div className="ac-only__paper-body">{Array.from({ length: 9 }).map((_,i) => <div key={i} className="ac-only__paper-line"/>)}</div></div>
            </div>
            <div className="ac-only__book"><Book/></div>
          </div>
          <div className="ac-only__col ac-only__col--right">
            {c.rightFeatures.map((f, i) => (
              <div key={i}>
                <div className="ac-only__feat-title">{f.title}</div>
                <div className="ac-only__feat-body">{f.body}</div>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal className="ac-only__stats" delay={160}>
          {c.stats.map((s, i) => (
            <div className="ac-only__stat" key={i}>
              <div className="ac-only__stat-value">{s.value}</div>
              <div className="ac-only__stat-label">{s.label}</div>
            </div>
          ))}
        </Reveal>
        <Reveal className="ac-only__cta-wrap" delay={200}>
          <CTA tag={c.ctaTagline} label={c.ctaLabel} onClick={onCheckout}/>
          <a className="ac-only__cta-sub" href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{c.ctaSubLink}</a>
          <div className="ac-only__guarantee-row">
            <GuaranteeBadge size={64}/>
            <div className="ac-only__guarantee-text">{c.guaranteeText}</div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── DEMO ─── */
function Demo() {
  const c = useContent().demo;
  return (
    <section className="ac-demo" aria-labelledby="demo-h2">
      <div className="ac-demo__inner">
        <Reveal><h2 className="ac-demo__h2" id="demo-h2">{c.h2}</h2></Reveal>
        <Reveal delay={120}>
          <div className="ac-demo__video">
            <VideoPlayer src={c.videoUrl} poster={c.videoPoster} label="Demo video"/>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── TESTIMONIALS ─── */
function Testimonials() {
  const c = useContent().testimonials;
  return (
    <section className="ac-testi" aria-labelledby="testi-h2">
      <div className="ac-testi__inner">
        <Reveal className="ac-testi__head">
          <div className="ac-testi__rating">
            <span className="ac-testi__rating-text">{c.rating}</span>
            <span className="ac-testi__rating-stars" aria-label="5 out of 5"><Stars/></span>
          </div>
          <h2 className="ac-testi__h2" id="testi-h2">{c.h2}</h2>
          <p className="ac-testi__pull">{c.pullQuote}</p>
        </Reveal>
        <div className="ac-testi__grid">
          {c.items.map((t, i) => (
            <Reveal className="ac-testi__card" key={i} delay={(i % 3) * 80}>
              {t.type === "video"
                ? <div className="ac-testi-card ac-testi-card--video">
                    <VideoPlayer src={t.videoUrl} poster={t.videoPoster} label={t.name}/>
                    <div className="ac-testi-card__video-foot">
                      <div className="ac-testi-card__name">{t.name}</div>
                      <div className="ac-testi-card__role">{t.role}</div>
                      <div className="ac-testi-card__video-quote">"{t.quote}"</div>
                    </div>
                  </div>
                : <div className="ac-testi-card">
                    <div className="ac-testi-card__head">
                      <div className="ac-testi-card__avatar" style={{ backgroundImage: `url(${t.avatar})` }} aria-hidden="true"/>
                      <div>
                        <div className="ac-testi-card__name">{t.name}</div>
                        <div className="ac-testi-card__role">{t.role}</div>
                      </div>
                    </div>
                    <div className="ac-testi-card__stars" aria-label="5 stars"><Stars/></div>
                    <p className="ac-testi-card__quote">{highlightQuote(t.quote, t.highlights)}</p>
                  </div>
              }
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
function highlightQuote(quote, highlights) {
  if (!highlights || !highlights.length) return quote;
  const parts = [{ text: quote, hl: false }];
  for (const h of highlights) {
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.hl) continue;
      const idx = p.text.toLowerCase().indexOf(h.toLowerCase());
      if (idx >= 0) {
        const before = p.text.slice(0, idx);
        const match = p.text.slice(idx, idx + h.length);
        const after = p.text.slice(idx + h.length);
        parts.splice(i, 1, { text: before, hl: false }, { text: match, hl: true }, { text: after, hl: false });
        break;
      }
    }
  }
  return parts.map((p, i) => p.hl ? <span className="ac-testi-card__hl" key={i}>{p.text}</span> : <span key={i}>{p.text}</span>);
}

/* ─── STACK ─── */
function Stack({ onCheckout }) {
  const c = useContent().stack;
  return (
    <section className="ac-stack" aria-labelledby="stack-h2">
      <div className="ac-stack__inner">
        <Reveal><h2 className="ac-stack__h2" id="stack-h2">{c.h2}</h2></Reveal>
        <Reveal delay={120}>
          <img className="ac-stack__hero-img" src={c.bigStackImg} alt="Everything you're getting in the Automatic Clients bundle" width="800" height="334" loading="lazy" decoding="async"/>
        </Reveal>
        <div className="ac-stack__grid">
          {c.items.map((it, i) => (
            <Reveal key={i} delay={(i % 3) * 80}>
              <div className="ac-stack-card">
                <div className="ac-stack-card__visual">
                  {it.kind === "book"
                    ? <Book size="sm" />
                    : <div className="ac-stack-card__ipad" aria-hidden="true"><div className="ac-stack-card__ipad-label">{shortLabel(it.title)}</div></div>}
                </div>
                <div className="ac-stack-card__title-block">
                  <div className="ac-stack-card__title">{it.title}</div>
                  <div className="ac-stack-card__sub">{it.sub}</div>
                </div>
                <p className="ac-stack-card__body">{it.body}</p>
                <div className="ac-stack-card__foot">
                  <span className="ac-stack-card__access"><Icons.Download/>{it.access}</span>
                  <span className="ac-stack-card__price">
                    <span className="ac-stack-card__price-was">Price: {it.priceWas}</span>
                    <span className="ac-stack-card__price-now">{it.priceNow}</span>
                  </span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal className="ac-only__cta-wrap" delay={200}>
          <CTA tag={c.ctaTagline} label={c.ctaLabel} onClick={onCheckout}/>
          <div className="ac-only__guarantee-row">
            <GuaranteeBadge size={64}/>
            <div className="ac-only__guarantee-text">{c.guaranteeText}</div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
function shortLabel(s) {
  return s.split(" ").slice(0, 2).join(" ");
}

/* ─── GUARANTEE ─── */
function GuaranteeSection() {
  const c = useContent().guarantee;
  return (
    <section className="ac-guarantee" aria-labelledby="guarantee-h2">
      <div className="ac-guarantee__inner">
        <Reveal><GuaranteeBadge size={124}/></Reveal>
        <Reveal delay={80}><h2 className="ac-guarantee__h2" id="guarantee-h2">{c.h2}</h2></Reveal>
        <Reveal delay={140}><div className="ac-guarantee__body">{c.body}</div></Reveal>
      </div>
    </section>
  );
}

/* ─── FAQ ─── */
function FAQ() {
  const c = useContent().faq;
  return (
    <section className="ac-faq" aria-labelledby="faq-h2">
      <div className="ac-faq__inner">
        <Reveal className="ac-faq__head">
          <h2 className="ac-faq__h2" id="faq-h2">{c.h2}</h2>
          <p className="ac-faq__sub">{c.sub}</p>
        </Reveal>
        <div className="ac-faq__grid">
          {c.items.map((q, i) => (
            <Reveal className="ac-faq__item" key={i} delay={(i % 2) * 80}>
              <div className="ac-faq__q">
                <span className="ac-faq__q-icon" aria-hidden="true"><Icons.Question/></span>
                <span className="ac-faq__q-text">{q.q}</span>
              </div>
              <p className="ac-faq__a">{q.a}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── FOOTER ─── */
function Footer({ onCheckout }) {
  const c = useContent().footer;
  const h = useContent().header;
  return (
    <footer className="ac-footer" role="contentinfo">
      <div className="ac-footer__inner">
        <Reveal><p className="ac-footer__disclaimer">{c.disclaimer}</p></Reveal>
        <Reveal delay={80} className="ac-footer__stack">
          <CTA tag={c.ctaTagline} label={c.ctaLabel} onClick={onCheckout}/>
        </Reveal>
        <Reveal delay={160}><p className="ac-footer__earnings">{c.earnings}</p></Reveal>
        <Reveal delay={200}>
          {h.logoLight
            ? <img src={h.logoLight} alt="Advanguard" className="ac-footer__logo-img" width="180" height="40"/>
            : <span className="ac-footer__logo">{c.logoText}</span>}
        </Reveal>
        <Reveal delay={240}><p className="ac-footer__copy">{c.copyright}</p></Reveal>
      </div>
    </footer>
  );
}

/* ─── Export to window so the host index.html can mount ─── */
Object.assign(window, {
  ContentProvider, useContent, Reveal, Icons,
  Stars, Book, GuaranteeBadge, VideoPlayer, CTA,
  Header, Headline, Hero, LogoStrip, OnlySystem, Demo,
  Testimonials, Stack, GuaranteeSection, FAQ, Footer,
});
})();
