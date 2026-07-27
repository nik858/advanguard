"use client";
import { useEffect, useRef, useState } from "react";
import { loadStripe, type StripeEmbeddedCheckout } from "@stripe/stripe-js";
import { useLeadGate } from "@/app/_sections/_shared/LeadGate";
import { Icons } from "@/app/_sections/_shared/Icons";
import { EditRich } from "@/app/_editor/EditRich";
import { RepeatableList } from "@/app/_editor/RepeatableList";
import { Erasable } from "@/app/_editor/Erasable";
import { mediaUrl, type OrderContent } from "@/types/content";
import { CLINIC_TYPES, CLINIC_TYPE_LABELS } from "@/lib/leads/clinic-types";
import { normalizeClinicUrl } from "@/lib/audit/domain";

// Premium variant of OrderForm (deliberately a separate component — the free
// form and its audit trigger must stay untouched for the split test).
// Three required fields, then an embedded Stripe Checkout ($27) rendered
// inline. The audit only fires server-side after the payment succeeds.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const selectStyle: React.CSSProperties = {
  marginTop: 8,
  WebkitAppearance: "none",
  MozAppearance: "none",
  appearance: "none",
  backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%2371717a' stroke-width='1.5' d='m4 6 4 4 4-4'/%3e%3c/svg%3e\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 16px center",
  backgroundSize: "14px",
  paddingRight: 40,
};

export function PremiumOrderForm({ content: order }: { content: OrderContent }) {
  const [email, setEmail] = useState("");
  const [clinicType, setClinicType] = useState("");
  const [clinicUrl, setClinicUrl] = useState("");
  const [phase, setPhase] = useState<"form" | "starting" | "checkout">("form");
  const [errorMsg, setErrorMsg] = useState("");
  // Which fields the visitor has interacted with — invalid hints only show
  // after a field was touched, so the pristine form isn't covered in red.
  const [touched, setTouched] = useState<{ email?: boolean; type?: boolean; url?: boolean }>({});
  const checkoutRef = useRef<StripeEmbeddedCheckout | null>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const { submitted } = useLeadGate();

  const emailValid = EMAIL_RE.test(email.trim());
  const typeValid = clinicType !== "";
  const urlValid = normalizeClinicUrl(clinicUrl) !== null;
  const canPay = emailValid && typeValid && urlValid;

  const fieldError = (bad: boolean) => (bad ? { borderColor: "#c62828" } : undefined);
  const hintStyle: React.CSSProperties = { color: "#c62828", fontSize: 12, margin: "4px 2px 0", textAlign: "left" };
  const missing: string[] = [];
  if (!emailValid) missing.push("work email");
  if (!typeValid) missing.push("clinic type");
  if (!urlValid) missing.push("clinic website");

  // Mount the embedded checkout once its container is in the DOM.
  useEffect(() => {
    if (phase === "checkout" && checkoutRef.current && mountRef.current) {
      checkoutRef.current.mount(mountRef.current);
    }
  }, [phase]);

  // Destroy the Stripe iframe when the component unmounts.
  useEffect(() => () => { checkoutRef.current?.destroy(); checkoutRef.current = null; }, []);

  async function startCheckout(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canPay || phase !== "form") return;
    setPhase("starting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/premium/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          clinic_type: clinicType,
          clinic_url: clinicUrl.trim(),
          website: honeypotRef.current?.value ?? "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.clientSecret) {
        setErrorMsg(data.error || "Could not start checkout. Please try again.");
        setPhase("form");
        return;
      }
      const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      const stripe = pk ? await loadStripe(pk) : null;
      if (!stripe) throw new Error("Stripe.js failed to load");
      checkoutRef.current = await stripe.createEmbeddedCheckoutPage({ clientSecret: data.clientSecret });
      setPhase("checkout");
    } catch (err) {
      console.error("[premium] checkout start failed", err);
      setErrorMsg("Could not start checkout. Please try again.");
      setPhase("form");
    }
  }

  function backToForm() {
    checkoutRef.current?.destroy();
    checkoutRef.current = null;
    setPhase("form");
  }

  const successMessageNode = (
    <div className="ac-order__success ac-order__success--field" role="status" aria-live="polite">
      <span className="ac-order__success-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13l4 4L19 7" />
        </svg>
      </span>
      <span className="ac-order__success-text">
        <EditRich edit={false} path="order.successMessage">{order.successMessage || "Success. Your Patient-Leak Findings will be emailed in 3-minutes"}</EditRich>
      </span>
    </div>
  );

  return (
    <aside className="ac-order" aria-label="Order form">
      <Erasable path="order.badge" label="badge">
        <div className="ac-order__strip">
          <EditRich edit={false} path="order.badge">{order.badge}</EditRich>
        </div>
      </Erasable>
      <Erasable path="order.image" label="order image">
        {mediaUrl(order.image) && (
          <div className="ac-order__image" style={{ position: "relative" }}>
            <img
              src={mediaUrl(order.image)}
              alt={typeof order.image === "object" && order.image ? (order.image.alt ?? "") : ""}
              className="ac-order__image-img"
            />
          </div>
        )}
      </Erasable>
      <div className="ac-order__product">
        <Erasable path="order.productName" label="product name">
          <div className="ac-order__product-name">
            <EditRich edit={false} path="order.productName">{order.productName}</EditRich>
          </div>
        </Erasable>
        <Erasable path="order.productSubtitle" label="product subtitle">
          <div className="ac-order__product-sub">
            <EditRich edit={false} path="order.productSubtitle">{order.productSubtitle}</EditRich>
          </div>
        </Erasable>
      </div>
      <div className="ac-order__inner">
        {(order.limitedTime ?? "").trim() && (
          <Erasable path="order.limitedTime" label="limited time">
            <div className="ac-order__limited">
              <EditRich edit={false} path="order.limitedTime">{order.limitedTime}</EditRich>
            </div>
          </Erasable>
        )}
        {((order.priceWas ?? "").trim() || (order.priceNow ?? "").trim() || (order.priceSubLine ?? "").trim()) && (
          <Erasable path="order.priceRow" label="price row">
            <div className="ac-order__price-row">
              <div>
                <Erasable path="order.priceWas" label="old price" as="span">
                  <span className="ac-order__price-was">
                    <EditRich edit={false} path="order.priceWas">{order.priceWas}</EditRich>
                  </span>
                </Erasable>
                <Erasable path="order.priceNow" label="current price" as="span">
                  <span className="ac-order__price">
                    <EditRich edit={false} path="order.priceNow">{order.priceNow}</EditRich>
                  </span>
                </Erasable>
              </div>
              <Erasable path="order.priceSubLine" label="price subline">
                <div className="ac-order__price-sub">
                  <EditRich edit={false} path="order.priceSubLine">{order.priceSubLine}</EditRich>
                </div>
              </Erasable>
            </div>
          </Erasable>
        )}
        <Erasable path="order.description" label="description">
          <p className="ac-order__desc">
            <EditRich edit={false} path="order.description" multiline>{order.description}</EditRich>
          </p>
        </Erasable>

        {submitted ? (
          successMessageNode
        ) : phase === "checkout" ? (
          <div>
            <div ref={mountRef} style={{ margin: "4px -8px 0" }} />
            <button
              type="button"
              onClick={backToForm}
              style={{ background: "none", border: "none", padding: "10px 0 0", fontSize: 13, color: "#71717a", cursor: "pointer", textDecoration: "underline" }}
            >
              ← Back to edit my details
            </button>
          </div>
        ) : (
          <form onSubmit={startCheckout} aria-label="Order">
            <label htmlFor="lead-email-input" className="visually-hidden">Work email</label>
            <input
              id="lead-email-input"
              name="email"
              type="email"
              required
              placeholder="Enter your work email"
              className="ac-order__field"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              style={fieldError(!!touched.email && !emailValid)}
            />
            {touched.email && !emailValid && (
              <p style={hintStyle}>Please enter a valid email address.</p>
            )}
            <label htmlFor="clinic_type" className="visually-hidden">Type of clinic</label>
            <select
              id="clinic_type"
              name="clinic_type"
              required
              className="ac-order__field"
              value={clinicType}
              onChange={(e) => { setClinicType(e.target.value); setTouched((t) => ({ ...t, type: true })); }}
              onBlur={() => setTouched((t) => ({ ...t, type: true }))}
              style={{ ...selectStyle, ...fieldError(!!touched.type && !typeValid) }}
            >
              <option value="" disabled hidden>Type of clinic</option>
              {CLINIC_TYPES.map((v) => (
                <option key={v} value={v}>{CLINIC_TYPE_LABELS[v]}</option>
              ))}
            </select>
            {touched.type && !typeValid && (
              <p style={hintStyle}>Please select your clinic type.</p>
            )}
            <label htmlFor="clinic_url" className="visually-hidden">Clinic website URL</label>
            <input
              id="clinic_url"
              name="clinic_url"
              type="text"
              required
              inputMode="url"
              placeholder="Your clinic website (e.g. yourclinic.com)"
              className="ac-order__field"
              autoComplete="url"
              value={clinicUrl}
              onChange={(e) => setClinicUrl(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, url: true }))}
              style={{ marginTop: 8, ...fieldError(!!touched.url && !urlValid) }}
            />
            {touched.url && !urlValid && (
              <p style={hintStyle}>Please enter a valid website address, e.g. yourclinic.com — no spaces.</p>
            )}
            {/* Honeypot: positioned offscreen, bots fill it but humans don't */}
            <input
              ref={honeypotRef}
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1 }}
            />
            <div style={{ height: 12 }} />
            <button
              className="ac-cta"
              type="submit"
              disabled={!canPay || phase === "starting"}
              aria-label={order.ctaLabel}
              style={!canPay || phase === "starting" ? { opacity: 0.55, cursor: "not-allowed" } : undefined}
            >
              {(order.ctaTagline ?? "").trim() && (
                <span className="ac-cta__tag">
                  <EditRich edit={false} path="order.ctaTagline">{order.ctaTagline}</EditRich>
                </span>
              )}
              <span className="ac-cta__label">
                {phase === "starting"
                  ? "Loading secure checkout…"
                  : <EditRich edit={false} path="order.ctaLabel">{order.ctaLabel}</EditRich>}
                <span className="ac-cta__arrow"><Icons.ArrowRight /></span>
              </span>
            </button>
            {!canPay && (
              <p style={{ color: "#71717a", fontSize: 12, margin: "8px 2px 0", textAlign: "center" }}>
                Fill in your {missing.join(", ")} to unlock secure checkout.
              </p>
            )}
            {errorMsg && <p style={{ color: "#c62828", fontSize: 13, marginTop: 8 }}>{errorMsg}</p>}
          </form>
        )}

        <Erasable path="order.secureText" label="secure text">
          <div className="ac-order__secure">
            <span className="ac-order__check" aria-hidden="true">✓</span>
            <span><EditRich edit={false} path="order.secureText">{order.secureText}</EditRich></span>
          </div>
        </Erasable>
        <Erasable path="order.guaranteeText" label="guarantee text">
          <div className="ac-order__guarantee-row">
            <div className="ac-order__guarantee-text">
              <EditRich edit={false} path="order.guaranteeText">{order.guaranteeText}</EditRich>
            </div>
          </div>
        </Erasable>
        <Erasable path="order.ratingText" label="rating text">
          <div className="ac-order__rating">
            <span className="ac-order__rating-text">
              <EditRich edit={false} path="order.ratingText">{order.ratingText}</EditRich>
            </span>
          </div>
        </Erasable>
        <div className="ac-order__mini-testimonials">
          <RepeatableList
            path="order.miniTestimonials"
            newItem={{ avatar: "", name: "Name", role: "Role", quote: "Short quote." }}
            edit={false}
          >
            {order.miniTestimonials.map((t, i) => (
              <div className="ac-order__mini-card" key={i}>
                <Erasable path={`order.miniTestimonials.${i}.avatar`} label="avatar">
                  <div className="ac-order__mini-avatar" style={{ backgroundImage: `url(${mediaUrl(t.avatar)})` }} aria-hidden="true" />
                </Erasable>
                <div>
                  <Erasable path={`order.miniTestimonials.${i}.name`} label="name">
                    <div className="ac-order__mini-name">
                      <EditRich edit={false} path={`order.miniTestimonials.${i}.name`}>{t.name}</EditRich>
                    </div>
                  </Erasable>
                  <Erasable path={`order.miniTestimonials.${i}.role`} label="role">
                    <div className="ac-order__mini-role">
                      <EditRich edit={false} path={`order.miniTestimonials.${i}.role`}>{t.role}</EditRich>
                    </div>
                  </Erasable>
                  <Erasable path={`order.miniTestimonials.${i}.quote`} label="quote">
                    <div className="ac-order__mini-quote">&quot;<EditRich edit={false} path={`order.miniTestimonials.${i}.quote`}>{t.quote}</EditRich>&quot;</div>
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
