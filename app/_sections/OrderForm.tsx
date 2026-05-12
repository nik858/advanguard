"use client";
import { useState } from "react";
import { CTA } from "./_shared/CTA";
import { GuaranteeBadge } from "./_shared/GuaranteeBadge";
import { Stars } from "./_shared/Stars";
import { mediaUrl, type Content } from "@/types/content";

export function OrderForm({ content: order, onCheckout }: { content: Content["order"]; onCheckout?: () => void }) {
  const [status, setStatus] = useState<"idle" | "busy" | "ok" | "err">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("busy");
    const fd = new FormData(e.currentTarget);
    const body = { email: fd.get("email"), phone: fd.get("phone"), website: fd.get("website") };
    const res = await fetch("/api/lead", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { setStatus("ok"); onCheckout?.(); }
    else {
      const b = await res.json().catch(() => ({}));
      setErrorMsg(b.error || "Erreur");
      setStatus("err");
    }
  }

  return (
    <aside className="ac-order" aria-label="Order form">
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
        <form onSubmit={onSubmit} aria-label="Order">
          <label htmlFor="email" className="visually-hidden">Email</label>
          <input id="email" name="email" type="email" required placeholder="Enter your email" className="ac-order__field" autoComplete="email" />
          <div style={{ height: 9 }}/>
          <label htmlFor="phone" className="visually-hidden">Phone</label>
          <input id="phone" name="phone" type="tel" placeholder="Phone number (for bonuses)" className="ac-order__field" autoComplete="tel" />
          {/* Honeypot: positioned offscreen, bots fill it but humans don't */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1 }} />
          <div style={{ height: 12 }}/>
          <CTA tag={order.ctaTagline} label={status === "busy" ? "Envoi..." : order.ctaLabel} />
          {status === "err" && <p style={{ color: "#c62828", fontSize: 13, marginTop: 8 }}>{errorMsg}</p>}
          {status === "ok" && <p style={{ color: "#15803d", fontSize: 13, marginTop: 8 }}>Merci, on revient vers vous!</p>}
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
              <div className="ac-order__mini-avatar" style={{ backgroundImage: `url(${mediaUrl(t.avatar)})` }} aria-hidden="true"/>
              <div>
                <div className="ac-order__mini-name">{t.name}</div>
                <div className="ac-order__mini-role">{t.role}</div>
                <div className="ac-order__mini-quote">&quot;{t.quote}&quot;</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
