// Separate LeadGate storage key for the paid funnel: a free-page submission
// must never lock the paid form (and vice versa) — the split test stays clean.
export const PAID_SUBMITTED_KEY = "advanguard_paid_submitted";
