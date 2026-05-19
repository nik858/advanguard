# Mail Sequence Funnel — Design Spec

**Date:** 2026-05-19
**Status:** approved (sections 1-3); sections 4-5 delegated to author's best practices

## 1. Goal

Turn the single-shot audit email into a **3-step nurture sequence** triggered by every inbound lead:

- **Mail 1** — sent immediately after scrape (T+0).
- **Mail 2** — sent ~24h later, focused on a different signal group.
- **Mail 3** — sent ~48h later, closes the loop with the third signal group.

Sender becomes `nik@bookingleak.com`. Nik (the operator) can edit each mail's prompt, delay, and the shared HTML template from `/admin/funnel`, and can manually stop the sequence on a per-lead basis.

## 2. Architecture

```
POST /api/lead
  → insertLead (DB)
  → after() → runAuditPipeline:
      1. resolveReachableUrl
      2. crawlSite (homepage + sitemap, cap 20 pages)
      3. parseSignalsV2 + parseEnrichment + fetchPageSpeed
      4. loadPromptsV2 (Blob; fallback to bundled)
      5. generateAuditEmails (3 parallel Claude Opus calls)
      6. renderHtml (apply html_template per mail)
      7. scheduleResendEmails (3x Resend with scheduled_at)
      8. updateLeadAudit (persist signals_v2 + scheduled_emails ids)
```

If any step fails, the pipeline emits a fallback content for the affected mail(s) — the schedule is preserved.

## 3. Components

### 3.1 Crawler (`lib/audit/crawler.ts`)

- Inputs: homepage URL.
- Reads `sitemap.xml` (or `/sitemap_index.xml`). If present, picks same-origin URLs up to 20.
- Excludes blog/news/post-style paths (`/blog/`, `/news/`, `/post/`, date-prefixed slugs).
- If no sitemap, falls back to a BFS depth-2 crawl from homepage links.
- Fetches with concurrency 4, 8s timeout per page.
- Classifies each page by URL slug + title keywords:
  - **service** — implant, all-on-4, all-on-6, all-on-x, full-arch, smile-makeover, smile-design, veneers, crown, bridge, denture, botox, filler, dysport, lift, rhinoplasty, lipo, body-contouring, laser, peel, microneedling, prp, hair-restoration, transplant, treatment, service, procedure, therapy, consultation.
  - **team** — /team, /about, /our-doctors, /staff, /providers, /meet-the-team.
  - **faq** — /faq, /questions.
  - **testimonials** — /testimonials, /reviews.
- Returns `{ homepage, pages: [{ url, html, category }] }`.

### 3.2 SignalsV2 (`lib/audit/signals-v2.ts`)

Pure function: `(crawl: CrawlResult, pagespeed: PageSpeedSignals | null, url: string) => SignalsV2`.

```ts
type SignalsV2 = {
  url: string;
  is_https: boolean;
  pages_crawled: number;
  service_page_urls: string[];

  // Email 1 (1-6)
  before_after: { case_count: number; pass: boolean };
  booking_widget: {
    homepage: boolean;
    service_pages: { url: string; pass: boolean }[];
    pass: boolean;
    booking_homepage_only: boolean;
    missing_pages: string[];
  };
  testimonials: { onsite_count: number; pass: boolean };
  live_chat: { platform: string | null; pass: boolean };
  mobile_responsive: { score: number | null; pass: boolean; critical: boolean };
  tracking: {
    meta_pixel: boolean;
    google_ads: boolean;
    google_analytics: boolean;
    missing: ("meta_pixel" | "google_ads" | "google_analytics")[];
    pass: boolean;
  };

  // Email 2 (7-10)
  images_per_service_page: {
    pages: { url: string; count: number; pass: boolean }[];
    pass: boolean;
    no_individual_service_pages: boolean;
  };
  pricing: { pass: boolean; gated: boolean; free_consult_offered: boolean };
  homepage_video: { pass: boolean };
  page_speed: { score: number | null; pass: boolean; critical: boolean };

  // Email 3 (11-16)
  team_credentials: {
    has_named_provider: boolean;
    has_photo: boolean;
    has_credential: boolean;
    pass: boolean;
  };
  ssl: { pass: boolean };
  schema_local_business: { pass: boolean; types_found: string[] };
  multilingual: { pass: boolean };
  financing_partners: { detected: string[]; pass: boolean };
  faq: { pass: boolean };
};
```

Detection notes:

- **before/after**: per-page scan of `<img>` tags. A "case" = 1 composite image (alt/filename matches markers) OR a before+after pair (siblings with matching `before-*` + `after-*` filenames). Markers: `before`, `after`, `before & after`, `before and after`, `results`, `case study`, `transformation`, `smile makeover`, `patient case`, `outcome`. Generic clinic photos (no marker) excluded. Aggregate across all pages, dedupe by image URL. Threshold ≥10.
- **booking widget**: scripts/iframes for Calendly, Acuity, NexHealth, SimplyBook, LocalMed, Square Appointments, Zocdoc + buttons matching `book online`, `book a consultation`, `schedule appointment` (linking to a booking URL, not `mailto:` or `/contact`). Checked on each service page. `pass = service_pages.length > 0 && all pass`. `booking_homepage_only = homepage && !all service_pages pass`.
- **testimonials**: count `<blockquote>` with author names, structured quote blocks, dedicated testimonials/reviews pages. Threshold ≥5.
- **live chat**: source-level detection of Intercom, Drift, Tawk.to, Tidio, LiveChat, Zendesk Chat, HubSpot Chat, Crisp, Smartsupp, Olark, Facebook Customer Chat, ManyChat, Chatra, JivoChat. Voice receptionists (Goodcall, Smith.ai) excluded.
- **mobile_responsive**: from PageSpeed Insights. ≥70 = pass, <50 = critical.
- **tracking**: requires ALL three (Meta Pixel, Google Ads `AW-`, Google Analytics `G-`/`UA-`). `missing` array tells the AI which one(s).
- **images_per_service_page**: count content images per service page, exclude logos/icons/social/decorative, exclude images already counted as B/A. Threshold ≥3 per page; pass requires all service pages to meet it. `no_individual_service_pages = single homepage with 30+ images and no service pages`.
- **pricing**: regex for `$X`, `$X,XXX`, `from $X`, `starting at`, financing language, "$X/month". `gated = true` if `contact for pricing` / `call for pricing` / `pricing available upon consultation`. `free_consult_offered` flagged separately.
- **homepage_video**: `<video>`, YouTube/Vimeo/Wistia/JW Player embeds, hero autoplay. GIFs and CSS animations excluded.
- **page_speed**: PageSpeed mobile performance. ≥70 = pass, <50 = critical.
- **team_credentials**: scan team page + homepage for named individuals (capitalised first+last names), photos, credentials (`DDS`, `DMD`, `MD`, `BDS`, `MBBS`, "years of experience", "graduated from").
- **ssl**: `url.startsWith("https://")` (cert validation handled by fetch error path).
- **schema_local_business**: JSON-LD `@type` matching `LocalBusiness`, `MedicalBusiness`, `MedicalClinic`, `Dentist`, `MedicalSpa`, `HealthClub`.
- **multilingual**: `hreflang` tags, URL prefixes `/es/`, `/zh/`, `/vi/`, `/pt/`, `/ru/`, language toggle UI.
- **financing_partners**: text/alt/filename match for CareCredit, LendingClub, Sunbit, Cherry, Proceed Finance, Affirm, Klarna, Splitit, Delta Dental, Cigna, Aetna, BCBS, Blue Cross, MetLife, Humana, UnitedHealthcare.
- **faq**: `FAQPage` schema, accordions with question-answer, `H3`/`H4` ending in `?`, dedicated `/faq` page.

A `formatSignalsV2ForPrompt(signals)` helper renders the structure into a human-readable block Claude can reason over.

### 3.3 Prompts v2 (`types/prompts.ts`, `content/prompts.json`)

```ts
const HtmlTemplateSchema = z.string().min(1).refine(
  (s) => s.includes("{{body_html}}"),
  "html_template must include {{body_html}}",
);

const MailConfigSchema = z.object({
  delay_hours: z.number().min(0).max(72),
  email_instructions: z.string().min(1),
  subject_instructions: z.string().min(1),
});

const PromptsSchemaV2 = z.object({
  version: z.literal(2),
  shared: z.object({
    system_prompt: z.string().min(1),
    tone: z.string().min(1),
    signature: z.string().min(1),
  }),
  html_template: HtmlTemplateSchema,
  emails: z.object({
    mail_1: MailConfigSchema,
    mail_2: MailConfigSchema,
    mail_3: MailConfigSchema,
  }),
});
```

`loadPrompts()` reads the Blob:

- If `version === 2` → use as-is.
- If `version === 1` (or missing) → migrate in memory (system/tone/signature → `shared`, existing `email_instructions`/`subject_instructions` → `mail_1`, seeded defaults for mail_2/mail_3). Migration is in-memory only; next save promotes to v2 in Blob.
- If invalid → fall back to bundled `content/prompts.json` (v2).

Bundled defaults seed each mail's `email_instructions` with signal-set focus per the brief (1-6 / 7-10 / 11-16). Delays default to 0/24/48h.

### 3.4 HTML template renderer (`lib/audit/template.ts`)

```ts
export function renderHtmlTemplate(
  template: string,
  vars: { body_html: string; subject: string; first_name: string; signature: string; domain: string },
): string;
```

- Substitution: `/\{\{(\w+)\}\}/g`.
- All variables HTML-escaped except `body_html` (already safe HTML from `bodyToHtml`).
- Unknown placeholders left as-is (no error thrown — fail-safe).

### 3.5 AI generation (`lib/audit/ai.ts`)

```ts
export async function generateAuditEmails(
  signals: SignalsV2,
  enrichment: Enrichment,
  lead: Lead,
  prompts: PromptsV2,
): Promise<{ mail_1: AuditEmail; mail_2: AuditEmail; mail_3: AuditEmail }>;
```

- Model: `claude-opus-4-7`, `max_tokens: 2048`.
- 3 parallel calls via `Promise.all`.
- Same `system_prompt` (cached via `cache_control: ephemeral`) and same signal block for all 3.
- Per-call user message uses the tab's `email_instructions` + `subject_instructions`.
- Each result parsed as `{subject, body}` JSON (existing pattern). On parse failure for one mail, that mail falls back individually (`generateFallbackEmail(lead, "AI parse error", mailIndex)`).

### 3.6 Resend scheduling (`lib/email.ts`)

```ts
export async function sendAuditEmail(input: {
  to: string;
  subject: string;
  html: string;     // already rendered
  text: string;     // plain-text fallback
  scheduledAt?: Date;
}): Promise<{ id: string }>;

export async function cancelScheduledEmail(id: string): Promise<void>;
```

- `from` constant becomes `nik@bookingleak.com`.
- Wraps `resend.emails.send({ scheduled_at: scheduledAt?.toISOString() })`.
- Returns Resend's email id so the caller can persist + cancel later.
- Existing 3-attempt retry loop preserved.

### 3.7 Pipeline (`lib/audit/index.ts`)

Replaces single-shot `runAudit` with a 3-mail orchestrator. Persists:

- `auditSubject`/`auditBody` — keep Mail 1 (for backwards compat with admin views).
- `signals` (jsonb) — now contains the SignalsV2 structure.
- `enrichment` — unchanged.
- `scheduledEmails` (new jsonb column) — `[{ tab: 1|2|3, resend_id, scheduled_for, status: 'scheduled'|'sent'|'cancelled'|'failed', subject, body }]`.
- `sequenceStopped` (new boolean column).

If a Resend send fails for one mail, log + persist `status: 'failed'` for that entry but continue with the others.

## 4. DB Migration

`lib/db/migrations/0003_mail_sequence.sql`:

```sql
ALTER TABLE "leads" ADD COLUMN "scheduled_emails" jsonb;
ALTER TABLE "leads" ADD COLUMN "sequence_stopped" boolean DEFAULT false NOT NULL;
```

`signals` jsonb column reused (no migration). The shape just becomes richer.

## 5. API surface

| Endpoint | Method | Notes |
| --- | --- | --- |
| `/api/prompts` | GET | Returns v2 (migrates v1 in memory if needed). |
| `/api/prompts` | PUT | Validates v2 schema. |
| `/api/prompts` | DELETE | Reset to bundled v2 default. |
| `/api/audit/preview` | POST | Body: `{ email, prompts? }`. Returns `{ outcome, reason, signals, mails: [{ subject, body, html, delay_hours }] }`. Runs the full pipeline once, returns all 3 generated mails — no Resend send. |
| `/api/admin/leads/[id]/stop-sequence` | POST | Cancels remaining scheduled Resend emails, sets `sequence_stopped = true`. |
| `/api/lead` | POST | Unchanged surface; calls new `runAudit` internally. |

## 6. Admin UI — `/admin/funnel`

Layout (top-to-bottom):

1. **⚙ Configuration** — `html_template` code editor + live preview (iframe with sample variables). Variable hint chips. Reset-to-default button.
2. **Shared prompts** — `system_prompt` (textarea), `tone`, `signature`.
3. **Mail tabs** — `[ Mail 1 · 0h ][ Mail 2 · 24h ][ Mail 3 · 48h ]`. Per tab: `delay_hours` numeric input, `subject_instructions`, `email_instructions`, Reset-this-tab button.
4. **🧪 Test preview** — `Test with domain` input → runs `POST /api/audit/preview` → renders the 3 generated mails (subject + rendered HTML) side-by-side. Collapsible JSON of signals.
5. Sticky Save bar with dirty-detection (existing pattern).

## 7. Lead drawer — Stop sequence

In `LeadDetailDrawer`:

- New section "Mail sequence" — lists the 3 scheduled emails with status badges (scheduled / sent / cancelled / failed) and scheduled date.
- "Stop sequence" button — visible only when at least one `scheduled` entry remains. Calls `POST /api/admin/leads/[id]/stop-sequence`. On success, refreshes the lead and shows toast.

## 8. Testing strategy

Unit (vitest):

- `crawler.test.ts` — sitemap parse, BFS, classification.
- `signals-v2.test.ts` — each of the 16 signals against rich + thin fixtures; tracking-missing list correctness; before/after dedup; per-service-page booking.
- `template.test.ts` — variable substitution, HTML escape, missing variable handling.
- `ai.test.ts` — mocked Anthropic, asserts the 3 calls receive the right per-mail instructions and share the cached system prompt.
- `email.test.ts` — mocked Resend, asserts `scheduled_at` ISO string, asserts cancel.
- `index.test.ts` — mocked deps, end-to-end pipeline returns 3 scheduled entries.
- `prompts.test.ts` — v1→v2 migration, schema validation.

Manual smoke test:

- Start dev server.
- Submit a lead from the landing page.
- Verify DB row has 3 `scheduled_emails` entries.
- Open `/admin/funnel`, edit a prompt, run preview, see 3 mails rendered.
- Open a lead drawer, click "Stop sequence", verify Resend cancel + DB flag.

## 9. Non-goals (v1)

- Google Places API for review counts (deferred).
- Reply detection / inbound parsing.
- Per-tab system prompt overrides (the shared system prompt is enough; tabs only override instructions/subject/delay).
- A/B testing across leads.
- HTML template variations per mail (one global template, by design).
- Automatic resume of a stopped sequence.
