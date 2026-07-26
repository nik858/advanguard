"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// One shared "this visitor already submitted a lead" flag for the whole page.
// Persisted in localStorage so it survives reloads, new tabs and browser
// restarts — that is what blocks duplicate leads / spam. Lives in a context so
// every CTA on the page (order form + the scroll-to-form buttons in Stack,
// OnlySystem and Footer) flips to the success banner together.
const SUBMITTED_KEY = "advanguard_lead_submitted";
// Same-tab broadcast: localStorage's "storage" event only fires in OTHER tabs,
// so we dispatch this to update the current tab's CTAs the instant a lead lands.
const SUBMITTED_EVENT = "advanguard:lead-submitted";

type LeadGate = {
  submitted: boolean;
  markSubmitted: () => void;
  /** Copy shown in place of every CTA once submitted. */
  successMessage: string;
};

// Default (no provider, e.g. the editor's LandingTree) is never-submitted so
// the operator always sees live CTAs.
const Ctx = createContext<LeadGate>({ submitted: false, markSubmitted: () => {}, successMessage: "" });

export function useLeadGate(): LeadGate {
  return useContext(Ctx);
}

export function LeadGateProvider({
  successMessage,
  children,
  // The paid variant (/paid) passes its own key so a free-page submission
  // never locks the paid form (and vice versa). Defaults keep the free page
  // byte-identical.
  storageKey = SUBMITTED_KEY,
}: { successMessage: string; children: ReactNode; storageKey?: string }) {
  const [submitted, setSubmitted] = useState(false);
  const eventName = storageKey === SUBMITTED_KEY ? SUBMITTED_EVENT : `${storageKey}:submitted`;

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) === "1") setSubmitted(true);
    } catch { /* localStorage unavailable (private mode) */ }

    const onSubmittedHere = () => setSubmitted(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue === "1") setSubmitted(true);
    };
    window.addEventListener(eventName, onSubmittedHere);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(eventName, onSubmittedHere);
      window.removeEventListener("storage", onStorage);
    };
  }, [storageKey, eventName]);

  const markSubmitted = () => {
    setSubmitted(true);
    try { localStorage.setItem(storageKey, "1"); } catch { /* ignore */ }
    try { window.dispatchEvent(new Event(eventName)); } catch { /* ignore */ }
  };

  return <Ctx.Provider value={{ submitted, markSubmitted, successMessage }}>{children}</Ctx.Provider>;
}
