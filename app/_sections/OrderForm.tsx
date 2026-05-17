"use client";
import { useState } from "react";
import { CTA } from "./_shared/CTA";
import { Stars } from "./_shared/Stars";
import { Edit } from "../_editor/Edit";
import { RepeatableList } from "../_editor/RepeatableList";
import { mediaUrl, type OrderContent } from "@/types/content";
import { CLINIC_TYPES, CLINIC_TYPE_LABELS } from "@/lib/leads/clinic-types";

export function OrderForm({ content: order, onCheckout, edit = false }: { content: OrderContent; onCheckout?: () => void; edit?: boolean }) {
  const [status, setStatus] = useState<"idle" | "busy" | "ok" | "err">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("busy");
    const fd = new FormData(e.currentTarget);
    const clinic = fd.get("clinic_type");
    const body = {
      email: fd.get("email"),
      clinic_type: typeof clinic === "string" && clinic ? clinic : undefined,
      website: fd.get("website"),
    };
    const res = await fetch("/api/lead", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { setStatus("ok"); onCheckout?.(); }
    else {
      const b = await res.json().catch(() => ({}));
      setErrorMsg(b.error || "Error");
      setStatus("err");
    }
  }

  return (
    <aside className="ac-order" aria-label="Order form">
      <div className="ac-order__strip">
        <Edit edit={edit} path="order.badge">{order.badge}</Edit>
      </div>
      <div className="ac-order__product">
        <div className="ac-order__product-name">
          <Edit edit={edit} path="order.productName">{order.productName}</Edit>
        </div>
        <div className="ac-order__product-sub">
          <Edit edit={edit} path="order.productSubtitle">{order.productSubtitle}</Edit>
        </div>
      </div>
      <div className="ac-order__inner">
        <div className="ac-order__limited">
          <Edit edit={edit} path="order.limitedTime">{order.limitedTime}</Edit>
        </div>
        <div className="ac-order__price-row">
          <div>
            <span className="ac-order__price-was">
              <Edit edit={edit} path="order.priceWas">{order.priceWas}</Edit>
            </span>
            <span className="ac-order__price">
              <Edit edit={edit} path="order.priceNow">{order.priceNow}</Edit>
            </span>
          </div>
          <div className="ac-order__price-sub">
            <Edit edit={edit} path="order.priceSubLine">{order.priceSubLine}</Edit>
          </div>
        </div>
        <p className="ac-order__desc">
          <Edit edit={edit} path="order.description" multiline>{order.description}</Edit>
        </p>
        <form onSubmit={onSubmit} aria-label="Order">
          <label htmlFor="email" className="visually-hidden">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="Enter your work email"
            className="ac-order__field"
            autoComplete="email"
          />
          <label htmlFor="clinic_type" className="visually-hidden">Type of clinic</label>
          <select
            id="clinic_type"
            name="clinic_type"
            className="ac-order__field"
            defaultValue=""
            style={{ marginTop: 8 }}
          >
            <option value="" disabled hidden>Type of clinic (optional)</option>
            {CLINIC_TYPES.map((v) => (
              <option key={v} value={v}>{CLINIC_TYPE_LABELS[v]}</option>
            ))}
          </select>
          {/* Honeypot: positioned offscreen, bots fill it but humans don't */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ position: "absolute", left: "-9999px", width: 1, height: 1 }}
          />
          <div style={{ height: 12 }} />
          <CTA
            type={edit ? "button" : "submit"}
            tag={<Edit edit={edit} path="order.ctaTagline">{order.ctaTagline}</Edit>}
            label={status === "busy"
              ? "Sending…"
              : <Edit edit={edit} path="order.ctaLabel">{order.ctaLabel}</Edit>}
            ariaLabel={order.ctaLabel}
          />
          {status === "err" && <p style={{ color: "#c62828", fontSize: 13, marginTop: 8 }}>{errorMsg}</p>}
          {status === "ok" && <p style={{ color: "#15803d", fontSize: 13, marginTop: 8 }}>Thanks, we&apos;ll be in touch!</p>}
        </form>
        <div className="ac-order__secure">
          <span className="ac-order__check" aria-hidden="true">✓</span>
          <span><Edit edit={edit} path="order.secureText">{order.secureText}</Edit></span>
        </div>
        <div className="ac-order__guarantee-row">
          <div className="ac-order__guarantee-text">
            <Edit edit={edit} path="order.guaranteeText">{order.guaranteeText}</Edit>
          </div>
        </div>
        <div className="ac-order__rating">
          <span className="ac-order__rating-text">
            <Edit edit={edit} path="order.ratingText">{order.ratingText}</Edit>
          </span>
          <span className="ac-order__rating-stars" aria-label="5 out of 5 stars"><Stars/></span>
        </div>
        <div className="ac-order__mini-testimonials">
          <RepeatableList
            path="order.miniTestimonials"
            newItem={{ avatar: "", name: "Name", role: "Role", quote: "Short quote." }}
            edit={edit}
          >
          {order.miniTestimonials.map((t, i) => (
            <div className="ac-order__mini-card" key={i}>
              <div className="ac-order__mini-avatar" style={{ backgroundImage: `url(${mediaUrl(t.avatar)})` }} aria-hidden="true"/>
              <div>
                <div className="ac-order__mini-name">
                  <Edit edit={edit} path={`order.miniTestimonials.${i}.name`}>{t.name}</Edit>
                </div>
                <div className="ac-order__mini-role">
                  <Edit edit={edit} path={`order.miniTestimonials.${i}.role`}>{t.role}</Edit>
                </div>
                <div className="ac-order__mini-quote">&quot;<Edit edit={edit} path={`order.miniTestimonials.${i}.quote`}>{t.quote}</Edit>&quot;</div>
              </div>
            </div>
          ))}
          </RepeatableList>
        </div>
      </div>
    </aside>
  );
}
