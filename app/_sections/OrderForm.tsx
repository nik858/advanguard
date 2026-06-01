"use client";
import { useState } from "react";
import { CTA } from "./_shared/CTA";
import { useLeadGate } from "./_shared/LeadGate";
import { EditRich } from "../_editor/EditRich";
import { RepeatableList } from "../_editor/RepeatableList";
import { MediaSlot } from "../_editor/MediaSlot";
import { Erasable } from "../_editor/Erasable";
import { mediaUrl, type OrderContent } from "@/types/content";
import { CLINIC_TYPES, CLINIC_TYPE_LABELS } from "@/lib/leads/clinic-types";

export function OrderForm({ content: order, onCheckout, edit = false }: { content: OrderContent; onCheckout?: () => void; edit?: boolean }) {
  const [status, setStatus] = useState<"idle" | "busy" | "ok" | "err">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  // Shared, page-wide "already submitted" flag (persisted in localStorage). Once
  // set, this form locks AND every other CTA on the page flips to the success
  // banner — see LeadGate. Always false in the editor, so live forms keep working.
  const { submitted, markSubmitted } = useLeadGate();

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
    if (res.ok) {
      setStatus("ok");
      markSubmitted();
      onCheckout?.();
    }
    else {
      const b = await res.json().catch(() => ({}));
      setErrorMsg(b.error || "Error");
      setStatus("err");
    }
  }

  // Locked = already submitted (remembered across sessions). Never locked in the editor, where
  // the operator needs the live form to keep working.
  const locked = submitted && !edit;

  // Shown in place of the input fields once a lead is in (and as an editable
  // preview in the editor). Always visible — no viewport-dependent variant.
  const successMessageNode = () => (
    <Erasable path="order.successMessage" label="success message">
      <div
        className="ac-order__success ac-order__success--field"
        role="status"
        aria-live="polite"
      >
        <span className="ac-order__success-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <span className="ac-order__success-text">
          <EditRich edit={edit} path="order.successMessage">{order.successMessage || "Success. Your Patient-Leak Findings will be emailed in 3-minutes"}</EditRich>
        </span>
      </div>
    </Erasable>
  );

  return (
      <aside className="ac-order" aria-label="Order form">
      <Erasable path="order.badge" label="badge">
        <div className="ac-order__strip">
          <EditRich edit={edit} path="order.badge">{order.badge}</EditRich>
        </div>
      </Erasable>
      <Erasable path="order.image" label="order image">
        {(mediaUrl(order.image) || edit) && (
          <div className="ac-order__image" style={{ position: "relative" }}>
            {mediaUrl(order.image) && (
              <img
                src={mediaUrl(order.image)}
                alt={typeof order.image === "object" && order.image ? (order.image.alt ?? "") : ""}
                className="ac-order__image-img"
              />
            )}
            {edit && <MediaSlot path="order.image" accept="image" compact />}
          </div>
        )}
      </Erasable>
      <div className="ac-order__product">
        <Erasable path="order.productName" label="product name">
          <div className="ac-order__product-name">
            <EditRich edit={edit} path="order.productName">{order.productName}</EditRich>
          </div>
        </Erasable>
        <Erasable path="order.productSubtitle" label="product subtitle">
          <div className="ac-order__product-sub">
            <EditRich edit={edit} path="order.productSubtitle">{order.productSubtitle}</EditRich>
          </div>
        </Erasable>
      </div>
      <div className="ac-order__inner">
        {(edit || (order.limitedTime ?? "").trim()) && (
          <Erasable path="order.limitedTime" label="limited time">
            <div className="ac-order__limited">
              <EditRich edit={edit} path="order.limitedTime">{order.limitedTime}</EditRich>
            </div>
          </Erasable>
        )}
        {(edit || (order.priceWas ?? "").trim() || (order.priceNow ?? "").trim() || (order.priceSubLine ?? "").trim()) && (
          <Erasable path="order.priceRow" label="price row">
            <div className="ac-order__price-row">
              <div>
                <Erasable path="order.priceWas" label="old price" as="span">
                  <span className="ac-order__price-was">
                    <EditRich edit={edit} path="order.priceWas">{order.priceWas}</EditRich>
                  </span>
                </Erasable>
                <Erasable path="order.priceNow" label="current price" as="span">
                  <span className="ac-order__price">
                    <EditRich edit={edit} path="order.priceNow">{order.priceNow}</EditRich>
                  </span>
                </Erasable>
              </div>
              <Erasable path="order.priceSubLine" label="price subline">
                <div className="ac-order__price-sub">
                  <EditRich edit={edit} path="order.priceSubLine">{order.priceSubLine}</EditRich>
                </div>
              </Erasable>
            </div>
          </Erasable>
        )}
        <Erasable path="order.description" label="description">
          <p className="ac-order__desc">
            <EditRich edit={edit} path="order.description" multiline>{order.description}</EditRich>
          </p>
        </Erasable>
        {locked ? (
          successMessageNode()
        ) : (
        <form onSubmit={onSubmit} aria-label="Order">
          <label htmlFor="lead-email-input" className="visually-hidden">Email</label>
          <input
            id="lead-email-input"
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
            style={{
              marginTop: 8,
              WebkitAppearance: "none",
              MozAppearance: "none",
              appearance: "none",
              backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%2371717a' stroke-width='1.5' d='m4 6 4 4 4-4'/%3e%3c/svg%3e\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 16px center",
              backgroundSize: "14px",
              paddingRight: 40,
            }}
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
            edit={edit}
            tag={<EditRich edit={edit} path="order.ctaTagline">{order.ctaTagline}</EditRich>}
            label={status === "busy"
              ? "Sending…"
              : <EditRich edit={edit} path="order.ctaLabel">{order.ctaLabel}</EditRich>}
            ariaLabel={order.ctaLabel}
          />
          {edit && successMessageNode()}
          {status === "err" && <p style={{ color: "#c62828", fontSize: 13, marginTop: 8 }}>{errorMsg}</p>}
        </form>
        )}
        <Erasable path="order.secureText" label="secure text">
          <div className="ac-order__secure">
            <span className="ac-order__check" aria-hidden="true">✓</span>
            <span><EditRich edit={edit} path="order.secureText">{order.secureText}</EditRich></span>
          </div>
        </Erasable>
        <Erasable path="order.guaranteeText" label="guarantee text">
          <div className="ac-order__guarantee-row">
            <div className="ac-order__guarantee-text">
              <EditRich edit={edit} path="order.guaranteeText">{order.guaranteeText}</EditRich>
            </div>
          </div>
        </Erasable>
        <Erasable path="order.ratingText" label="rating text">
          <div className="ac-order__rating">
            <span className="ac-order__rating-text">
              <EditRich edit={edit} path="order.ratingText">{order.ratingText}</EditRich>
            </span>
          </div>
        </Erasable>
        <div className="ac-order__mini-testimonials">
          <RepeatableList
            path="order.miniTestimonials"
            newItem={{ avatar: "", name: "Name", role: "Role", quote: "Short quote." }}
            edit={edit}
          >
          {order.miniTestimonials.map((t, i) => (
            <div className="ac-order__mini-card" key={i}>
              <Erasable path={`order.miniTestimonials.${i}.avatar`} label="avatar">
                <div className="ac-order__mini-avatar" style={{ backgroundImage: `url(${mediaUrl(t.avatar)})` }} aria-hidden="true"/>
              </Erasable>
              <div>
                <Erasable path={`order.miniTestimonials.${i}.name`} label="name">
                  <div className="ac-order__mini-name">
                    <EditRich edit={edit} path={`order.miniTestimonials.${i}.name`}>{t.name}</EditRich>
                  </div>
                </Erasable>
                <Erasable path={`order.miniTestimonials.${i}.role`} label="role">
                  <div className="ac-order__mini-role">
                    <EditRich edit={edit} path={`order.miniTestimonials.${i}.role`}>{t.role}</EditRich>
                  </div>
                </Erasable>
                <Erasable path={`order.miniTestimonials.${i}.quote`} label="quote">
                  <div className="ac-order__mini-quote">&quot;<EditRich edit={edit} path={`order.miniTestimonials.${i}.quote`}>{t.quote}</EditRich>&quot;</div>
                </Erasable>
              </div>
            </div>
          ))}
          </RepeatableList>
        </div>
      </div>
      </aside>
  );
}
