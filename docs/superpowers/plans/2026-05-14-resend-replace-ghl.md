# Resend Replaces GHL — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the GoHighLevel webhook with Resend for delivering the AI-generated audit email, and remove every GHL reference from the codebase.

**Architecture:** A new server-only module `lib/email.ts` wraps the official `resend` SDK and exposes `sendAuditEmail({to, subject, body})`. The single existing GHL call site in `lib/audit/index.ts` switches to it. `lib/ghl.ts`, its test, the `GHL_AUDIT_WEBHOOK_URL` env var, and the admin UI mentions of GHL are deleted.

**Tech Stack:** Next.js 16 App Router, Node.js runtime, `resend` SDK, vitest, TypeScript strict, plain-text → HTML conversion done in-module.

**Spec:** [`docs/superpowers/specs/2026-05-14-resend-replace-ghl-design.md`](../specs/2026-05-14-resend-replace-ghl-design.md)

---

## File map

| Path | Action | Responsibility |
|---|---|---|
| `lib/email.ts` | Create | Wrap Resend SDK. Export `sendAuditEmail`, `bodyToHtml`, `RESEND_FROM`. |
| `tests/lib/email.test.ts` | Create | 7 vitest specs covering payload, HTML conversion, escaping, env, retry. |
| `lib/audit/index.ts` | Modify | Swap `postAuditToGHL(...)` for `sendAuditEmail(...)` inside `runAudit`. Update doc comment. |
| `lib/ghl.ts` | Delete | No longer used. |
| `tests/lib/ghl.test.ts` | Delete | Tests for the deleted module. |
| `.env.example` | Modify | Remove `GHL_AUDIT_WEBHOOK_URL` block, add `RESEND_API_KEY` block. |
| `app/admin/page.tsx` | Modify | Line ~67: replace "hand-off to GoHighLevel" wording. |
| `app/admin/settings/page.tsx` | Modify | Replace the `ghlAudit` const + the `<Row label="GHL Audit webhook" ...>` with a Resend row. |
| `package.json` | Modify | `npm i resend` (adds the dependency + updates lockfile). |

No other files are touched.

---

## Task 1: Add the `resend` dependency

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install the SDK**

Run: `npm i resend`
Expected: `package.json` gains `"resend": "^4.x.x"` (or newer) under `dependencies`. `package-lock.json` updates. Console prints "added N packages".

- [ ] **Step 2: Verify the install**

Run: `node -e "console.log(require('resend').Resend.name)"`
Expected: prints `Resend`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add resend SDK dependency"
```

---

## Task 2: Write failing tests for `lib/email.ts`

**Files:**
- Create: `tests/lib/email.test.ts`

- [ ] **Step 1: Write the test file**

Create `tests/lib/email.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockSend = vi.fn();
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

// Import AFTER the mock so the SDK is already stubbed.
import { sendAuditEmail, bodyToHtml, RESEND_FROM } from "@/lib/email";

describe("lib/email — bodyToHtml", () => {
  it("converts paragraphs + line breaks to semantic HTML", () => {
    expect(bodyToHtml("Line 1\nLine 2\n\nParagraph 2")).toBe(
      "<p>Line 1<br>Line 2</p><p>Paragraph 2</p>"
    );
  });

  it("escapes HTML in the body", () => {
    const html = bodyToHtml("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toMatch(/<script[^>]*>/i);
  });

  it("escapes ampersands and quotes", () => {
    expect(bodyToHtml('Tom & "Jerry"')).toBe('<p>Tom &amp; &quot;Jerry&quot;</p>');
  });
});

describe("lib/email — sendAuditEmail", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "test_key";
    mockSend.mockReset();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends with the expected payload", async () => {
    mockSend.mockResolvedValueOnce({ data: { id: "x" }, error: null });

    await sendAuditEmail({ to: "a@b.com", subject: "Sub", body: "Hello" });

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith({
      from: RESEND_FROM,
      to: "a@b.com",
      subject: "Sub",
      text: "Hello",
      html: "<p>Hello</p>",
    });
  });

  it("throws if RESEND_API_KEY is unset and never calls the SDK", async () => {
    delete process.env.RESEND_API_KEY;
    await expect(
      sendAuditEmail({ to: "a@b.com", subject: "x", body: "x" })
    ).rejects.toThrow(/RESEND_API_KEY/);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("does not retry on 4xx", async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { statusCode: 422, name: "validation_error", message: "Bad" },
    });

    await expect(
      sendAuditEmail({ to: "a@b.com", subject: "x", body: "x" })
    ).rejects.toThrow(/422/);

    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("retries on 5xx and eventually throws after 3 attempts", async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { statusCode: 500, name: "internal", message: "Boom" },
    });

    const p = sendAuditEmail({ to: "a@b.com", subject: "x", body: "x" });

    // First attempt fires immediately, then 1s backoff, then 3s backoff.
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(3000);

    await expect(p).rejects.toThrow(/500/);
    expect(mockSend).toHaveBeenCalledTimes(3);
  });

  it("recovers when a 5xx is followed by a success", async () => {
    mockSend
      .mockResolvedValueOnce({
        data: null,
        error: { statusCode: 500, name: "internal", message: "Boom" },
      })
      .mockResolvedValueOnce({
        data: null,
        error: { statusCode: 502, name: "bad_gateway", message: "Boom" },
      })
      .mockResolvedValueOnce({ data: { id: "ok" }, error: null });

    const p = sendAuditEmail({ to: "a@b.com", subject: "x", body: "x" });
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(3000);

    await expect(p).resolves.toBeUndefined();
    expect(mockSend).toHaveBeenCalledTimes(3);
  });
});
```

- [ ] **Step 2: Run the tests, confirm they fail**

Run: `npm test -- tests/lib/email.test.ts`
Expected: FAIL — module `@/lib/email` not found.

- [ ] **Step 3: Commit**

```bash
git add tests/lib/email.test.ts
git commit -m "test(email): add failing specs for resend wrapper"
```

---

## Task 3: Implement `lib/email.ts`

**Files:**
- Create: `lib/email.ts`

- [ ] **Step 1: Write the module**

Create `lib/email.ts`:

```ts
import { Resend } from "resend";

export const RESEND_FROM = "onboarding@resend.dev";

export type SendAuditEmailInput = {
  to: string;
  subject: string;
  body: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function bodyToHtml(body: string): string {
  return body
    .split(/\n\n+/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

const MAX_ATTEMPTS = 3;
const BACKOFFS_MS = [1000, 3000];

/**
 * Sends the audit email through Resend. Retries up to 3 times on 5xx/network
 * errors with backoff (1s, 3s). Fails fast on 4xx. Throws on missing API key.
 * Callers (the audit pipeline) wrap this in their own try/catch — the lead has
 * already received a 200 from /api/lead by the time this runs.
 */
export async function sendAuditEmail(input: SendAuditEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not set");
  const client = new Resend(apiKey);

  let lastErr: Error | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { error } = await client.emails.send({
      from: RESEND_FROM,
      to: input.to,
      subject: input.subject,
      text: input.body,
      html: bodyToHtml(input.body),
    });

    if (!error) return;

    const statusCode = (error as { statusCode?: number }).statusCode;
    const detail = `${statusCode ?? "network"}: ${error.message ?? error.name}`;

    // 4xx → client-side issue, retry won't help.
    if (statusCode !== undefined && statusCode < 500) {
      throw new Error(`Resend ${detail}`);
    }

    lastErr = new Error(`Resend ${detail}`);
    if (attempt < MAX_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, BACKOFFS_MS[attempt - 1]));
    }
  }

  throw lastErr ?? new Error("Resend send failed");
}
```

- [ ] **Step 2: Run the tests, confirm all pass**

Run: `npm test -- tests/lib/email.test.ts`
Expected: PASS — all 8 tests green (3 in `bodyToHtml`, 5 in `sendAuditEmail`).

- [ ] **Step 3: Commit**

```bash
git add lib/email.ts
git commit -m "feat(email): add resend wrapper with retry + html conversion"
```

---

## Task 4: Wire `sendAuditEmail` into the audit pipeline

**Files:**
- Modify: `lib/audit/index.ts`

- [ ] **Step 1: Read the current call site**

Open `lib/audit/index.ts`. Lines 64-76 currently are:

```ts
/**
 * Runs the full audit for one lead and delivers it via GHL. Never throws —
 * designed to be called fire-and-forget from `after()` in the lead route.
 */
export async function runAudit(lead: Lead): Promise<void> {
  const result = await runAuditPipeline(lead);
  try {
    await postAuditToGHL({
      email: lead.email,
      first_name: lead.firstName,
      ai_email_subject: result.email.subject,
      ai_email_body: result.email.body,
    });
  } catch (e) {
    console.error("[audit] GHL delivery failed", { domain: lead.domain, error: String(e) });
  }
}
```

And line 8 currently is:

```ts
import { postAuditToGHL } from "@/lib/ghl";
```

- [ ] **Step 2: Replace the import**

Change line 8 from:

```ts
import { postAuditToGHL } from "@/lib/ghl";
```

to:

```ts
import { sendAuditEmail } from "@/lib/email";
```

- [ ] **Step 3: Replace the function body and doc comment**

Replace lines 60-76 (the `/**` comment and the entire `runAudit` function) with:

```ts
/**
 * Runs the full audit for one lead and delivers it via Resend. Never throws —
 * designed to be called fire-and-forget from `after()` in the lead route.
 */
export async function runAudit(lead: Lead): Promise<void> {
  const result = await runAuditPipeline(lead);
  try {
    await sendAuditEmail({
      to: lead.email,
      subject: result.email.subject,
      body: result.email.body,
    });
  } catch (e) {
    console.error("[audit] email delivery failed", { domain: lead.domain, error: String(e) });
  }
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean. If it complains about an unused import or unused `lead.firstName` somewhere else, leave `firstName` on the `Lead` type — the fallback email + AI prompts still use it.

- [ ] **Step 5: Re-run the full test suite**

Run: `npm test`
Expected: all suites still pass (audit pipeline tests don't mock the GHL call directly, so swapping the import is invisible to them).

- [ ] **Step 6: Commit**

```bash
git add lib/audit/index.ts
git commit -m "feat(audit): deliver via resend instead of ghl"
```

---

## Task 5: Delete `lib/ghl.ts` and its test

**Files:**
- Delete: `lib/ghl.ts`
- Delete: `tests/lib/ghl.test.ts`

- [ ] **Step 1: Confirm nothing else imports `lib/ghl`**

Run: `grep -r "from \"@/lib/ghl\"\|from '@/lib/ghl'\|require.*lib/ghl" app lib tests`
Expected: 0 matches. If any remain, fix them first.

- [ ] **Step 2: Delete the files**

Run: `rm lib/ghl.ts tests/lib/ghl.test.ts`

- [ ] **Step 3: Typecheck + tests**

Run: `npx tsc --noEmit && npm test`
Expected: clean, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add -u lib/ghl.ts tests/lib/ghl.test.ts
git commit -m "chore: remove ghl module and tests"
```

---

## Task 6: Update `.env.example`

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Remove the GHL block**

Open `.env.example`. Find the block:

```
# GHL_AUDIT_WEBHOOK_URL: the GHL "Audit Email" inbound webhook — finished emails are POSTed here.
GHL_AUDIT_WEBHOOK_URL=https://services.leadconnectorhq.com/hooks/.../webhook-trigger/...
```

Delete those two lines, plus the blank line above them if leaving a double blank line.

- [ ] **Step 2: Add the Resend block**

Find the `# AI Audit Tool — REQUIRED` heading. Right above it, add:

```
# Email delivery — REQUIRED
# RESEND_API_KEY: Resend API key — sends the personalized audit email to leads.
# Get one at https://resend.com/api-keys. Server-only — never expose to the browser.
RESEND_API_KEY=re_...

```

- [ ] **Step 3: Confirm the GHL reference is gone**

Run: `grep -i "ghl\|leadconnector" .env.example`
Expected: 0 matches.

- [ ] **Step 4: Commit**

```bash
git add .env.example
git commit -m "chore(env): document RESEND_API_KEY, drop GHL_AUDIT_WEBHOOK_URL"
```

---

## Task 7: Update admin UI wording

**Files:**
- Modify: `app/admin/page.tsx`
- Modify: `app/admin/settings/page.tsx`

- [ ] **Step 1: Fix the funnel card description**

In `app/admin/page.tsx`, find the `<Link href="/admin/funnel" ...>` block (around line 60-68). The `<div className={styles.cardDesc}>` currently reads:

```tsx
The full journey: lead capture, validation, AI audit, hand-off to GoHighLevel.
```

Replace with:

```tsx
The full journey: lead capture, validation, AI audit, email delivery via Resend.
```

- [ ] **Step 2: Update settings page — env var check**

In `app/admin/settings/page.tsx`, find this line near the top of `SettingsPage`:

```tsx
const ghlAudit = !!process.env.GHL_AUDIT_WEBHOOK_URL;
```

Replace with:

```tsx
const resend = !!process.env.RESEND_API_KEY;
```

- [ ] **Step 3: Update settings page — row**

In the same file, find the `<Row>` element:

```tsx
<Row label="GHL Audit webhook" description="Endpoint where finished audit emails are sent for delivery." ok={ghlAudit} />
```

Replace with:

```tsx
<Row label="Resend API" description="Sends the personalized audit email to each lead." ok={resend} />
```

- [ ] **Step 4: Confirm no GHL references remain anywhere**

Run: `grep -rni "ghl\|gohighlevel\|leadconnector" app lib tests .env.example`
Expected: 0 matches.

- [ ] **Step 5: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: both clean. Build should succeed (Next.js compiles the admin routes).

- [ ] **Step 6: Commit**

```bash
git add app/admin/page.tsx app/admin/settings/page.tsx
git commit -m "chore(admin): replace GHL references with Resend wording"
```

---

## Task 8: Local smoke test

**Files:** none modified — manual verification.

- [ ] **Step 1: Add the dev key to `.env.local`**

Open `.env.local` and add (or replace) one line:

```
RESEND_API_KEY=re_xxx_your_dev_key_here
```

Remove the `GHL_AUDIT_WEBHOOK_URL=...` line from `.env.local` if present.

- [ ] **Step 2: Start the dev server**

Run: `npm run dev`
Expected: server boots on `http://localhost:3000`, no startup errors mentioning missing env vars.

- [ ] **Step 3: Submit the order form**

In a browser:
1. Open `http://localhost:3000`
2. In the order form, enter a real work-domain email you own (no `gmail.com`/`outlook.com` — those are in the blocked list at [app/api/lead/route.ts:12-18](../../../app/api/lead/route.ts#L12-L18))
3. Submit

Expected:
- The form shows "Thanks, we'll be in touch!"
- In the server console, you eventually see `[audit] success` (after ~30s for PageSpeed/Claude). No `[audit] email delivery failed` line.

- [ ] **Step 4: Verify Resend received the send**

Open https://resend.com/emails. Expected: a new "Delivered" row for the address you submitted, from `onboarding@resend.dev`.

- [ ] **Step 5: Verify the inbox**

Check the email inbox. Expected: an email arrives within 1-2 minutes, with the audit subject and a clean HTML body (paragraphs preserved, no escaped tags showing as text).

If anything fails, fix and re-run Tasks 3-7 as needed before moving on.

---

## Task 9: Vercel environment cleanup

**Files:** none modified — Vercel CLI.

- [ ] **Step 1: Confirm `vercel` CLI is logged in**

Run: `vercel whoami`
Expected: prints the user's Vercel handle. If not, run `vercel login` first.

- [ ] **Step 2: Add `RESEND_API_KEY` to Vercel (preview + production)**

Run: `vercel env add RESEND_API_KEY preview production`
When prompted, paste a **freshly-generated** Resend API key (the one in chat history is revoked at this point — see Step 4).

- [ ] **Step 3: Remove `GHL_AUDIT_WEBHOOK_URL` from Vercel**

Run: `vercel env rm GHL_AUDIT_WEBHOOK_URL preview production` (confirm `y` when prompted for each env).

Run: `vercel env ls`
Expected: `RESEND_API_KEY` listed, `GHL_AUDIT_WEBHOOK_URL` absent.

- [ ] **Step 4: Revoke the key that was pasted in chat**

In the Resend dashboard (https://resend.com/api-keys), revoke the key starting with `re_3crPdniQ_...` (the one shared in conversation). Confirm the key just added to Vercel is **a different key generated after this step**.

- [ ] **Step 5: Trigger a preview deploy and smoke-test it**

Either push a branch or run: `vercel deploy`
Open the preview URL, repeat the form-submission smoke test from Task 8 Steps 3-5 against the preview deployment.

Expected: same successful result as local. If yes, the chantier is done.

---

## Final verification checklist

- [ ] `grep -rni "ghl\|gohighlevel\|leadconnector" app lib tests .env.example` returns 0 results.
- [ ] `npm test` is fully green.
- [ ] `npm run build` succeeds.
- [ ] Preview deploy sends a real Resend email when the form is submitted.
- [ ] `vercel env ls` shows `RESEND_API_KEY` present in preview + production, `GHL_AUDIT_WEBHOOK_URL` absent everywhere.
- [ ] The Resend API key pasted in chat (`re_3crPdniQ_...`) is revoked in the Resend dashboard.
