# Chantier B — Replace GHL with Resend for audit email delivery

**Date:** 2026-05-14
**Status:** Approved design — ready for implementation plan
**Scope:** Audit/lead-magnet email delivery only. CRM persistence (chantier D), editable template (chantier C), and editable hero papers (chantier A) are separate specs.

## Goal

Stop relying on the GoHighLevel inbound webhook to send the AI-generated audit email. Send it directly from the app via Resend, and remove every trace of GHL from the codebase and from Vercel's environment.

## Non-goals

- No new email types (no admin notifications, no reply-to to Nik, no BCC) — chantier B is just the direct lead-facing send.
- No template editor — body still comes from the existing Claude pipeline (or the fallback).
- No CRM/lead storage — leads remain ephemeral until chantier D.
- No domain verification — we start on `onboarding@resend.dev`. Switching to `nik@advanguard.agency` (or similar) is a follow-up before production go-live, not part of this spec.

## Architecture

```
app/api/lead/route.ts              (unchanged — still calls runAudit() via after())
        │
        ▼
lib/audit/index.ts (runAudit)
        │  result = runAuditPipeline(lead)
        │  sendAuditEmail({ to, firstName, subject, body })   ← was postAuditToGHL(...)
        ▼
lib/email.ts                       (NEW — Resend wrapper)
        │
        ▼
Resend SDK → onboarding@resend.dev → lead inbox
```

Single new module: `lib/email.ts`. Everything else is either modified at one call site or deleted.

## `lib/email.ts` — public API

```ts
export const RESEND_FROM = "onboarding@resend.dev";

export type SendAuditEmailInput = {
  to: string;            // lead.email
  subject: string;       // from AuditEmail.subject
  body: string;          // plain-text body with \n separators, from AuditEmail.body
};

export async function sendAuditEmail(input: SendAuditEmailInput): Promise<void>;
```

When chantier C adds template variables (first name, domain, etc.), it extends this signature — not part of B.

### Body → HTML conversion

The Claude pipeline (and the fallback) returns plain text with `\n\n` paragraph breaks and `\n` line breaks. We send both `text` and `html` to Resend:

- `text`: pass `body` verbatim.
- `html`: split on `\n\n` into paragraphs, replace remaining `\n` with `<br>`, HTML-escape (`& < > "`), wrap each paragraph in `<p>...</p>`, no inline styles, no wrapper template. Plain semantic HTML — readable in every client and trivial to extend in chantier C.

### Error handling

- **Missing `RESEND_API_KEY`** → throw `Error("RESEND_API_KEY not set")`. Caller (`runAudit`) already has a try/catch that logs and swallows. The lead has already received the `200 ok` response from `/api/lead`.
- **Resend 4xx** → throw with the Resend error payload. No retry (4xx = client error, retry won't help).
- **Resend 5xx or network error** → retry up to 3 attempts total with exponential backoff (1s, 3s). Same shape as the current `postWithRetry` in `lib/ghl.ts`, but inlined and simplified — we don't need the abstraction for one call site.

### Implementation notes

- Use the official `resend` npm package (`npm i resend`). Don't hand-roll fetch — the SDK gives us typed errors and is one line to call.
- Instantiate `new Resend(apiKey)` lazily inside `sendAuditEmail`, not at module top. Keeps the module side-effect-free and importable during build.
- Server-only file. No `"use client"`. Module never reaches the browser bundle.

## Environment variables

| Variable | Change | Where |
|----------|--------|-------|
| `RESEND_API_KEY` | **Add** | `.env.example`, `.env.local`, Vercel (preview + production) |
| `GHL_AUDIT_WEBHOOK_URL` | **Remove** | `.env.example`, `.env.local`, Vercel (all environments) |

The user-supplied key `re_3crPdniQ_Gf6nUGmpc9Xgf7F9HkFDMtR3` was pasted in chat and **must be revoked in the Resend dashboard before this ships**. A fresh key gets added to Vercel via `vercel env add RESEND_API_KEY`. Never commit a real key.

## Files changed

**Deleted**
- `lib/ghl.ts` — full file
- `tests/lib/ghl.test.ts` — if it exists (verify during implementation)

**Created**
- `lib/email.ts`
- `tests/lib/email.test.ts`

**Modified**
- `lib/audit/index.ts` — replace the `postAuditToGHL({...})` call inside `runAudit` with `sendAuditEmail({...})`. Update the file-top doc comment that says "delivers it via GHL".
- `.env.example` — remove the `GHL_AUDIT_WEBHOOK_URL` block, add a `RESEND_API_KEY=re_...` block under a `# Email delivery — REQUIRED` heading.
- `app/admin/page.tsx` (line ~67) — replace the funnel card description that mentions "hand-off to GoHighLevel" with wording that mentions Resend.
- `app/admin/settings/page.tsx` — if it lists GHL integration status, replace the GHL row with a Resend row (key present / key missing).
- `package.json` — add `resend` dependency.

## Tests

`tests/lib/email.test.ts` — uses `vitest` and mocks the Resend SDK (`vi.mock('resend', ...)`).

1. **Happy path** — `sendAuditEmail({to, subject, body})` calls the Resend client with the expected payload: `from === RESEND_FROM`, `to === input.to`, `subject === input.subject`, `text === input.body`, `html` is non-empty.
2. **HTML conversion** — given `"Line 1\nLine 2\n\nParagraph 2"`, the `html` field contains two `<p>` tags, with `<br>` inside the first.
3. **HTML escaping** — given `"<script>alert(1)</script>"`, the `html` field contains `&lt;script&gt;` and never an unescaped `<script>`.
4. **Missing key** — when `RESEND_API_KEY` is unset, the function throws and the SDK is never called.
5. **4xx → no retry** — mock Resend to reject with a 422-style error once. The function throws on the first call; the mock is invoked exactly once.
6. **5xx → retry, eventually fails** — mock Resend to reject with a 500-style error 3 times. The function throws after 3 attempts.
7. **5xx → retry, recovers** — mock to fail twice with 500, then succeed. The function resolves and the mock is invoked 3 times.

No live network calls. No real Resend key in tests.

## Verification (post-implementation)

Before claiming done:

1. `npm test` — all new tests pass.
2. `npm run build` — typechecks clean, no references to `lib/ghl` remain (run `grep -r "ghl\|GHL\|leadconnector" app lib tests` and confirm 0 matches).
3. Local smoke test — `npm run dev`, fill the order form with a real (work-domain) email, confirm a Resend dashboard entry shows the send, confirm the inbox receives the audit email with both subject and body rendered.
4. Vercel preview deploy — same smoke test against the preview URL.
5. Vercel env — `vercel env ls` shows `RESEND_API_KEY` present and `GHL_AUDIT_WEBHOOK_URL` absent across preview + production.

## Risk register

| Risk | Mitigation |
|------|------------|
| API key in chat is leaked / abused | Revoke before shipping. New key added only via `vercel env add`. |
| `onboarding@resend.dev` lands in spam | Acceptable for testing; before production traffic resumes, set up DKIM/SPF on `advanguard.agency` and switch `RESEND_FROM`. Not in scope of B. |
| Existing leads already in GHL get orphaned | Out of scope. GHL contacts are not migrated; chantier D introduces the internal CRM going forward. |
| HTML conversion mangles the AI output | Tests cover paragraph + linebreak + escaping. The Claude prompt is unchanged so the body shape is stable. |
