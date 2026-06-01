"use client";
import type { ReactNode } from "react";
import { CTA } from "./CTA";
import { LeadSuccessBanner } from "./LeadSuccessBanner";
import { useLeadGate } from "./LeadGate";
import { scrollToLeadForm } from "@/lib/landing/scroll-to-lead-form";

// A scroll-to-the-order-form CTA that turns into the success banner once the
// visitor has submitted a lead. Used by every section outside the order card
// (Stack, OnlySystem, Footer) so a returning/submitted visitor never sees a
// second "give us your email" button. Never gated in the editor (edit mode),
// where the operator needs the live buttons.
export function LeadCTA({ tag, label, ariaLabel, edit = false }: {
  tag?: ReactNode;
  label: ReactNode;
  ariaLabel?: string;
  edit?: boolean;
}) {
  const { submitted, successMessage } = useLeadGate();

  if (submitted && !edit) {
    return <LeadSuccessBanner>{successMessage}</LeadSuccessBanner>;
  }

  return (
    <CTA
      edit={edit}
      tag={tag}
      label={label}
      ariaLabel={ariaLabel}
      onClick={scrollToLeadForm}
    />
  );
}
