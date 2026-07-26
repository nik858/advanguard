"use client";
import { useEffect } from "react";
import { useLeadGate } from "@/app/_sections/_shared/LeadGate";

// Flags the paid gate (localStorage) so a returning buyer sees the success
// state on /paid instead of the payment form.
export function MarkPaidSubmitted() {
  const { markSubmitted } = useLeadGate();
  useEffect(() => {
    markSubmitted();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
