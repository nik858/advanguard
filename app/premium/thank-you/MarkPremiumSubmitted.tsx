"use client";
import { useEffect } from "react";
import { useLeadGate } from "@/app/_sections/_shared/LeadGate";

// Flags the premium gate (localStorage) so a returning buyer sees the success
// state on /premium instead of the payment form.
export function MarkPremiumSubmitted() {
  const { markSubmitted } = useLeadGate();
  useEffect(() => {
    markSubmitted();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
