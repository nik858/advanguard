// Separate LeadGate storage key for the premium funnel: a free-page submission
// must never lock the premium form (and vice versa) — the split test stays clean.
export const PREMIUM_SUBMITTED_KEY = "advanguard_premium_submitted";
