# AI Audit Tool — Design Spec

**Date** : 2026-05-14
**Author** : TB Dev (Thomas) in collaboration with Claude
**Client** : Nik, CEO Advanguard
**Status** : Design approved, ready for planning
**Predecessor** : v1 landing + admin (`2026-05-12-advanguard-landing-admin-design.md`) — shipped, live at advanguard.vercel.app

---

## 1. Context and goals

### What this builds
The AI Clinic Audit Tool: when a clinic owner enters their professional email on the Advanguard landing page, the system automatically identifies their website, audits it, generates a personalized audit email with Claude, and delivers it through GoHighLevel — all within ~1-2 minutes, with no human intervention.

### Where it fits
The v1 landing + admin is live. The landing already has an email-capture form (`OrderForm`) and an `/api/lead` route. This project wires that form into a full audit pipeline. The GHL "Audit Email" workflow is already configured by Nik and expects a payload of `{ email, first_name, ai_email_subject, ai_email_body }`.

### Goals
1. Landing form submission → personalized audit email delivered, fully automated.
2. Lightweight, free-tier-friendly (Vercel Hobby + free API tiers).
3. Per-audit cost ~$0.01-0.05 (Claude Haiku).
4. The lead **always** receives an email — audit result on success, graceful fallback on any failure.
5. Nik can edit the AI prompts from the admin, with no code change and no rebuild.

### Non-goals (explicitly out of scope for v1)
- Browser rendering for JavaScript-heavy sites (those get flagged for manual review).
- A "is this a clinic?" classifier (lenient validation — audit any reachable pro domain).
- A database / queryable history of audits (leads live in GoHighLevel).
- A "test this prompt" feature in the admin.
- Email follow-up sequences (GoHighLevel's domain; Nik wants zero follow-ups for v1).
- Durable retry queue (`waitUntil` is sufficient for v1 volume).

---

## 2. Locked decisions

| Question | Decision |
|---|---|
| Lead entry point | The existing `OrderForm` email field on the landing. No funnel redesign, no copy rewrite — the landing is a template Nik edits himself. |
| Execution model | `/api/lead` validates, responds immediately, then runs the audit pipeline in the background via Vercel `waitUntil()`. Single endpoint, no queue, no second public endpoint. |
| Signal scope | All ~17 signals via lightweight HTML parsing (cheerio) + Google PageSpeed Insights API. |
| Browser rendering | Deferred. v1 = raw HTML + PageSpeed only. JS-heavy sites with thin HTML are flagged for manual review. |
| Site validation | Lenient. Audit any reachable professional domain. Flag for manual review only when unreachable / broken / near-empty. No clinic classifier. |
| Prompt framework | Claude writes a solid initial framework into `content/prompts.json`. Nik edits it from the admin. |
| Prompt storage | Vercel Blob (`prompts/current.json`), live editing — a prompt edit takes effect on the next audit with no rebuild. Falls back to the bundled `content/prompts.json` default if Blob is empty. |
| Delivery | Pipeline POSTs `{ email, first_name, ai_email_subject, ai_email_body }` to the GHL "Audit Email" webhook. GHL creates the contact and sends the one email. |
| Failure handling | Any pipeline failure → a graceful fallback email is generated and still POSTed to GHL. The lead is never left in silence. |

---

## 3. Architecture & data flow

```
Visitor → OrderForm → POST /api/lead
                         │
                         ├─ validate (block generic email domains) — already exists
                         ├─ respond 200 immediately ("your audit is on its way")
                         └─ waitUntil( runAudit(lead) )   ← background, up to 300s
                                │
                                ▼
                       lib/audit/index.ts :: runAudit
                                │
              ┌─────────────────┼──────────────────┐
              ▼                 ▼                  ▼
         domain.ts          scrape.ts          pagespeed.ts
    extract + normalize   fetch HTML +        Google PageSpeed
    + reachability check  cheerio: ~17 sig.    Insights API
              │                 │                  │
              └─────────────────┼──────────────────┘
                                ▼
                   signals.ts — assemble the Signals object
                                │
                                ▼
                   ai.ts — load prompt, call Claude → { subject, body }
                                │
                    ┌───────────┴────────────┐
                 success                  any-stage failure
                    │                        │
                    ▼                        ▼
              (use AI result)          fallback.ts → graceful email
                    │                        │
                    └───────────┬────────────┘
                                ▼
                     ghl.ts :: postAuditToGHL
              POST GHL "Audit Email" webhook
              { email, first_name, ai_email_subject, ai_email_body }
                                ▼
                  GHL creates contact + sends the email
```

### Pipeline stages

1. **Capture** (`/api/lead`) — receives `{ email, phone?, first_name?, website (honeypot) }` from the landing form. Validates: rejects generic email domains (logic already exists), honeypot check, rate limit. Responds `200` immediately. Schedules `runAudit(lead)` via `waitUntil()`. The previous behavior (forwarding to a separate `GHL_LEAD_WEBHOOK_URL`) is removed — there is no separate lead workflow; the audit pipeline ends with the only GHL call.
2. **Domain identification** (`domain.ts`) — extracts the domain from the email, normalizes it (https, www, follows redirects), checks reachability. If unreachable → fail fast to fallback.
3. **Signal extraction** — runs in parallel:
   - `scrape.ts` — fetches the homepage HTML and parses ~17 signals with cheerio. (v1 scope: homepage only — multi-page crawling of `/contact`, `/services` etc. is deferred; see §13.)
   - `pagespeed.ts` — calls Google PageSpeed Insights API for mobile + desktop performance/SEO/accessibility metrics.
4. **AI generation** (`ai.ts`) — loads the prompt (Blob → bundled default), assembles the `Signals` object into a structured message, calls Claude (Haiku), parses `{ subject, body }`.
5. **Delivery** (`ghl.ts :: postAuditToGHL`) — POSTs `{ email, first_name, ai_email_subject, ai_email_body }` to the GHL "Audit Email" webhook. Retries 3× with backoff on 5xx.

### Why `waitUntil`
The audit is ~30-90s of work (scrape ~2-10s, PageSpeed ~10-30s, Claude ~5-15s). The visitor's browser cannot wait. Vercel Fluid Compute's `waitUntil()` keeps the function alive after the response is sent, up to the function's `maxDuration` (set to 300s). No queue, no second endpoint to secure. The single risk — a function crash mid-audit loses the lead with no retry — is mitigated by structured logging at every step and the always-send-an-email fallback. If volume grows or durability matters, v1.1 can move to Vercel Queues.

---

## 4. File structure

```
lib/audit/
  index.ts          — orchestrator: runAudit(lead) chains the stages, owns error handling
  domain.ts         — extractDomain(email), normalize (https/www/redirects), checkReachable()
  scrape.ts         — fetchHtml() + parseSignals(): cheerio over the HTML, extracts ~17 signals
  pagespeed.ts      — Google PageSpeed Insights API client (perf, LCP, CLS, INP, SEO, a11y)
  signals.ts        — assembles the final Signals object (HTML signals + PageSpeed)
  ai.ts             — loads the prompt, builds the message, calls Claude, parses { subject, body }
  prompts.ts        — loadPrompts(): reads from Vercel Blob, falls back to the bundled default
  fallback.ts       — generateFallbackEmail(): graceful email when the pipeline fails

types/audit.ts      — NEW: Signals, AuditResult, AuditOutcome types
types/prompts.ts    — MODIFIED: richer PromptsSchema (system_prompt, email_instructions,
                      subject_instructions, tone, signature)
content/prompts.json — MODIFIED: real initial prompt framework (replaces the placeholder)

app/api/lead/route.ts        — MODIFIED: validate → respond 200 → waitUntil(runAudit(lead)).
                               The old `postLeadToGHL` call is removed — the audit pipeline's
                               final POST to the audit webhook is now the only GHL call.
lib/ghl.ts                   — MODIFIED: postAuditToGHL reworked to the GHL workflow shape
                               { email, first_name, ai_email_subject, ai_email_body }.
                               `postLeadToGHL` and the `GHL_LEAD_WEBHOOK_URL` env var are
                               removed — there is no separate "lead" workflow anymore, only
                               the single "Audit Email" workflow (Nik wants one email).
lib/blob.ts                  — MODIFIED: add savePrompts() / loadPrompts() on Blob

app/admin/funnel/page.tsx    — REPLACED: real prompt editor (was an explanatory stub)
app/admin/funnel/_components/PromptEditor.tsx — NEW: the editor form (client component)
app/api/prompts/route.ts     — NEW: GET (load) / PUT (save) prompts, session-protected

tests/lib/audit/domain.test.ts
tests/lib/audit/scrape.test.ts    — cheerio against fixture HTML files
tests/lib/audit/signals.test.ts
tests/lib/audit/ai.test.ts        — Claude mocked
tests/lib/audit/fallback.test.ts
tests/lib/ghl.test.ts             — MODIFIED: new postAuditToGHL shape
tests/api/lead.test.ts            — MODIFIED: asserts runAudit is scheduled
tests/fixtures/                   — sample HTML files for scrape tests
```

**Module discipline:** each module has one responsibility and is independently testable. `index.ts` is the only module that knows the stage ordering. `scrape.ts` knows nothing about Claude; `ai.ts` knows nothing about cheerio.

---

## 5. Signal extraction (~17 signals)

### Source 1 — raw HTML via `fetch` + cheerio (`scrape.ts`)
**v1 scope: the homepage only.** Multi-page crawling (fetching `/contact`, `/services`, `/about` etc.) is deferred to a later iteration — see §13. Homepage HTML is parsed for:

| Signal | Detection method |
|---|---|
| Tracking pixels (Meta Pixel, GA, Google Ads) | search `<script>` contents for `fbq(`, `gtag(`, `googletagmanager`, `google-analytics` |
| Booking widget / appointment CTA | links/buttons containing `book`, `appointment`, `rendez-vous`, `calendly`, `acuity`, `cal.com` |
| Testimonials / social proof | sections/classes with `testimonial`, `review`, `avis`, star ratings |
| Before/after gallery | `before`/`after` / `avant`/`après` keywords near images |
| FAQ section | sections/headings with `faq`, `frequently asked`, `questions fréquentes` |
| Schema markup (LocalBusiness, FAQ) | `<script type="application/ld+json">` parsed; check `@type` values |
| SSL / security | URL resolves over `https`; certificate validity observed during fetch |
| Live chat / chatbot | scripts: `intercom`, `drift`, `tawk`, `crisp`, `livechat` |
| Homepage video | `<video>` tags, YouTube/Vimeo/Wistia iframes |
| Pricing / financing visibility | keywords `price`, `$`, `€`, `financing`, `payment plan` |
| Google Reviews / reputation | review widgets, links to Google Maps / Google Business |
| Team / doctor credentials | pages/links `team`, `doctors`, `about`, `staff`, `équipe` |
| Multilingual support | `<link hreflang>`, language switcher |
| Service page structure | count and naming of internal links to "service"-type pages |
| Responsive / viewport | presence and configuration of `<meta name="viewport">` |
| Title / meta description | presence, length, quality |
| Contact info (phone, address) | `tel:` links, address patterns, `<address>` element |

### Source 2 — Google PageSpeed Insights API (`pagespeed.ts`)
One API call per strategy (mobile + desktop): LCP, CLS, INP, performance score, SEO score, accessibility score. Free; with an API key, 25k requests/day.

### Output
A typed `Signals` object (~17 fields). If a source fails (e.g. PageSpeed timeout), its fields are `null` and the pipeline continues — Claude works with whatever signals are available.

---

## 6. AI layer

### `content/prompts.json` — structure (what Nik edits)
```json
{
  "version": 1,
  "system_prompt": "You are an SEO/CRO expert for medical clinic websites...",
  "email_instructions": "Write a short, personalized email. Mention 2-3 strengths and 2-3 priority weaknesses. Tone: direct but supportive. End with an open question...",
  "subject_instructions": "Generate a short, compelling subject line, personalized with the domain...",
  "tone": "professional-warm",
  "signature": "The Advanguard Team"
}
```

### `ai.ts` — the Claude call
1. Load prompts (Blob → bundled default fallback).
2. Build the message: `system_prompt` + the formatted `Signals` object + `email_instructions` + `subject_instructions`.
3. Call Claude (model: **Haiku** — fast, ~$0.01-0.03/audit, sufficient for writing an email from structured signals).
4. Parse the response into `{ subject, body }`.
5. **Prompt caching** enabled on the `system_prompt` block to cut cost and latency on repeated calls.

### Prompt storage — Vercel Blob, live editing
Prompts live in Vercel Blob at `prompts/current.json`. Nik edits in the admin → saved to Blob → **the next audit uses the new prompt immediately, no rebuild**. If Blob has nothing, `loadPrompts()` falls back to the bundled `content/prompts.json`. (Different from landing content, which goes through Git/rebuild — live editing is the right call for prompts because Nik will iterate them frequently.)

---

## 7. Admin prompt editor

`app/admin/funnel/page.tsx` — currently an explanatory stub — becomes a real editor.

- **`PromptEditor.tsx`** (client component): text fields for `system_prompt`, `email_instructions`, `subject_instructions`, `tone`, `signature`.
- **Save** → `PUT /api/prompts` → writes to Blob → toast confirmation.
- **Reset to default** → reverts to the bundled `content/prompts.json` (with a ConfirmDialog).
- Protected by the existing admin session (the `/admin/*` middleware already covers this route).
- The page keeps a short explanatory header (the funnel overview from v1) above the editor so Nik has context.

### `app/api/prompts/route.ts`
- `GET` — session-checked; returns the current prompts (Blob → default).
- `PUT` — session-checked; validates the body against `PromptsSchema` (Zod); writes to Blob.

---

## 8. Error handling

Every stage degrades gracefully. The lead **always** receives an email.

| Failure | Behavior |
|---|---|
| Invalid / unreachable domain | → fallback email ("we couldn't reach your site, we'll review it manually") |
| Site reachable but near-empty (JS-heavy) | attempt anyway; thin signals → Claude generates what it can; if genuinely empty → fallback |
| PageSpeed API timeout / error | continue **without** performance metrics; the audit runs on HTML signals alone |
| Claude API failure | → graceful fallback email |
| GHL webhook failure | retry 3× with exponential backoff (already in `postWithRetry`), then log |
| Everything succeeds | full audit email |

The fallback email is always **graceful and useful** — never a technical error message. Structured logs are emitted at every stage (viewable via `vercel logs` / the Vercel dashboard) so failures are diagnosable.

---

## 9. Environment variables

To be added by TB Dev via `vercel env add` (never pasted in chat):

| Variable | Purpose | Required? |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude API (the AI generation step) | Required |
| `GOOGLE_PAGESPEED_API_KEY` | PageSpeed Insights API | Optional — works without a key at low volume, but rate-limited |
| `GHL_AUDIT_WEBHOOK_URL` | The GHL "Audit Email" inbound webhook (already created by Nik) | Required |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob — already set (used for drafts; now also prompts) | Already set |

---

## 10. Testing

- **Unit tests** (Vitest, all external calls mocked):
  - `domain.ts` — extraction, normalization, reachability edge cases
  - `scrape.ts` — `parseSignals()` against fixture HTML files in `tests/fixtures/`
  - `signals.ts` — assembly, null-handling when a source is missing
  - `ai.ts` — prompt assembly + response parsing (Claude mocked)
  - `fallback.ts` — fallback email generation
  - `ghl.ts` — the new `postAuditToGHL` payload shape
- **API route tests**:
  - `api/lead` — validates input, blocks generic domains, schedules `runAudit`
- External calls (`fetch`, PageSpeed, Claude, GHL) are always mocked — tests never hit the network.

---

## 11. Cost & performance

- **Per audit**: ~$0.01-0.05 (Claude Haiku, with prompt caching on the system prompt). PageSpeed API is free. Scraping is just `fetch`.
- **Latency**: ~30-90s end to end (scrape ~2-10s, PageSpeed ~10-30s, Claude ~5-15s, GHL POST ~1s). The email reaches the lead ~1-2 minutes after submission.
- **Vercel**: `/api/lead` runs on Fluid Compute with `maxDuration: 300`. Well within Hobby free tier at expected volume.

---

## 12. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Function crash mid-audit loses the lead (no retry) | Structured logging at every step; always-send-an-email fallback. Move to Vercel Queues in v1.1 if volume/durability demands it. |
| JS-heavy site yields thin HTML | Lenient handling — Claude works with whatever signals exist; genuinely empty → graceful fallback + manual-review framing. Browser rendering is a v1.1 option. |
| PageSpeed API rate limit | Add `GOOGLE_PAGESPEED_API_KEY` (25k/day). Pipeline degrades gracefully if PageSpeed is unavailable. |
| `waitUntil` exceeds maxDuration | Audit work is ~30-90s vs 300s budget — large margin. Each external call has its own timeout so no single call can hang the function. |
| Prompt edited to something broken | `PUT /api/prompts` validates against `PromptsSchema` (Zod) before writing; `loadPrompts()` falls back to the bundled default if Blob is unreadable. |
| Anthropic API key leaked (has happened in chat before) | Key added only via `vercel env add`, never in chat. Documented in `.env.example`. |

---

## 13. Out of scope for v1 (recap)

- Browser rendering for JS-heavy sites → flag for manual review instead.
- Clinic classifier → lenient validation instead.
- Audit history / database → leads live in GoHighLevel.
- "Test this prompt" admin feature.
- Email follow-up sequences → GoHighLevel's domain; Nik wants zero for v1.
- Durable retry queue → `waitUntil` is sufficient for v1 volume.
- **Multi-page crawling** → v1 audits the homepage only. Fetching `/contact`, `/services`, `/about` etc. to catch signals that live off the homepage (phone, address, deeper service structure) is deferred. Decision: ship homepage-only, see if audit quality is sufficient in practice, add multi-page later if needed.

---

## 14. Validation and next steps

- [x] Design approved in conversation
- [ ] Spec reviewed by TB Dev
- [ ] Implementation plan written (`writing-plans` skill)
- [ ] Implementation (subagent-driven)
