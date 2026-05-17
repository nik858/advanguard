# Clinic-type qualifier field on leads

**Date:** 2026-05-17
**Status:** Approved design — ready for implementation plan
**Scope:** Add an optional `clinic_type` qualifier captured at lead submission (public landing form + admin manual creation), stored in the `leads` table, surfaced in the admin list / drawer / CSV export. Used purely for downstream CRM segmentation — no backend logic depends on the value.

## Goal

Let inbound leads self-declare which kind of clinic they are (Dental Implant / Aesthetic Clinic / Med Spa / Other) so the team can qualify them when exporting to the external CRM. Optional input — leaving it blank must not block submission.

## Non-goals

- Backend routing or personalization based on the value. It's metadata only.
- Free-text follow-up when "Other" is picked. "Other" is a final value, nothing else opens.
- Editing the list of clinic types from the admin landing editor. The four values are stable verticals; hardcoded enum.
- Editing the `clinic_type` of an existing lead from the drawer. Read-only display for now; can be added later if needed.
- Filtering / segmenting the leads table by clinic type. The CSV export is enough for now.
- Backfilling existing rows. Old leads have a legitimate `NULL` ("not collected"); the admin shows `—`.

## Architecture

Single source of truth in TypeScript, consumed by the API validator, the public form, the admin form, the admin table/drawer, and the CSV export. Database column is `text` (nullable), validated at the API boundary via Zod enum. No DB-level CHECK constraint — the enum lives in one place in code, adding a value later means editing one file rather than running a new migration.

```
                       lib/leads/clinic-types.ts
                       (CLINIC_TYPES + LABELS)
                       │
        ┌──────────────┼──────────────────────────────┐
        │              │              │               │
        ▼              ▼              ▼               ▼
  OrderForm      lead/route.ts   admin/leads/    LeadsTable
  <select>       Zod enum        NewLeadDialog   LeadDetailDrawer
                                 <select>        CSV export
                       │
                       ▼
                insertLead({ clinicType })
                       │
                       ▼
                  leads.clinic_type (text, nullable, indexed)
```

## Data model

### Migration — `lib/db/migrations/0001_clinic_type.sql`

```sql
ALTER TABLE leads ADD COLUMN clinic_type text;
CREATE INDEX leads_clinic_type_idx ON leads (clinic_type);
```

Nullable so existing rows survive untouched. Indexed because CRM-style queries will typically group/filter on this column.

### Drizzle schema — `lib/db/schema.ts`

Add inside the `leads` `pgTable` definition:

```ts
clinicType: text("clinic_type"),
```

Add inside the index tuple:

```ts
index("leads_clinic_type_idx").on(t.clinicType),
```

Type derivations (`Lead`, `NewLead`) propagate automatically.

### Enum source of truth — `lib/leads/clinic-types.ts` (new)

```ts
export const CLINIC_TYPES = [
  "dental_implant",
  "aesthetic_clinic",
  "med_spa",
  "other",
] as const;

export type ClinicType = (typeof CLINIC_TYPES)[number];

export const CLINIC_TYPE_LABELS: Record<ClinicType, string> = {
  dental_implant: "Dental Implant",
  aesthetic_clinic: "Aesthetic Clinic",
  med_spa: "Med Spa",
  other: "Other",
};
```

Storage values are `snake_case` (URL-safe, no encoding issues, lowercase consistency). Display labels are decoupled so they can evolve without a DB migration.

## API contract

### `app/api/lead/route.ts` (public form)

Extend `BodySchema`:

```ts
import { CLINIC_TYPES } from "@/lib/leads/clinic-types";

const BodySchema = z.object({
  email: z.string().email(),
  first_name: z.string().optional(),
  phone: z.string().optional(),
  clinic_type: z.enum(CLINIC_TYPES).optional(),
  website: z.string().optional(),
});
```

Pass to `insertLead`:

```ts
row = await insertLead({
  email: parsed.data.email,
  firstName: parsed.data.first_name || null,
  phone: parsed.data.phone ?? null,
  domain,
  source: "inbound",
  clinicType: parsed.data.clinic_type ?? null,
});
```

Behaviour:
- Missing → stored `NULL`
- Valid enum value → stored as-is
- Invalid value → Zod fails, `400 Invalid email` (existing fallthrough message stays — no UI shows it for this field, but the contract is rejected)
- Honeypot path unchanged

### `app/api/admin/leads/route.ts` (manual creation)

Add the same `clinic_type: z.enum(CLINIC_TYPES).optional().nullable()` to the admin Zod schema, pass through to `insertLead` the same way.

### `lib/db/leads.ts`

Extend `InsertLeadInput`:

```ts
export type InsertLeadInput = {
  email: string;
  firstName?: string | null;
  phone?: string | null;
  domain?: string | null;
  source: LeadSource;
  clinicType?: ClinicType | null;
};
```

`insertLead` body is unchanged — Drizzle inserts the new column from the input object automatically.

## UI — public form

### `app/_sections/OrderForm.tsx`

Insert a `<select>` after the email input, before the honeypot:

```tsx
<label htmlFor="clinic_type" className="visually-hidden">Type of clinic</label>
<select
  id="clinic_type"
  name="clinic_type"
  className="ac-order__field"
  defaultValue=""
>
  <option value="" disabled hidden>Type of clinic (optional)</option>
  {CLINIC_TYPES.map((v) => (
    <option key={v} value={v}>{CLINIC_TYPE_LABELS[v]}</option>
  ))}
</select>
```

In the existing `onSubmit`, extend the body construction:

```ts
const clinic = fd.get("clinic_type");
const body = {
  email: fd.get("email"),
  clinic_type: typeof clinic === "string" && clinic ? clinic : undefined,
  website: fd.get("website"),
};
```

Empty value → omitted from the JSON payload → API stores `NULL`. Native `<select>` chosen for accessibility, mobile-friendliness, and zero new dependencies. Reuses the existing `.ac-order__field` class so styling matches the email input visually.

## UI — admin

### `app/admin/leads/_components/LeadsTable.tsx`

Add a column header `<th>Clinic</th>` between `Domain` and `Status`:

```tsx
<td className={styles.cellMuted}>
  {r.clinicType ? CLINIC_TYPE_LABELS[r.clinicType as ClinicType] : "—"}
</td>
```

(The type assertion is safe because the Zod enum is enforced at write-time.)

### `app/admin/leads/_components/LeadDetailDrawer.tsx`

Add a new key/value row inside the Contact `kv` grid, between `Domain` and `Source`:

```tsx
<div className={styles.kvKey}>Clinic</div>
<div className={styles.kvValue}>
  {lead.clinicType ? CLINIC_TYPE_LABELS[lead.clinicType as ClinicType] : "—"}
</div>
```

Read-only display only.

### `app/admin/leads/_components/NewLeadDialog.tsx`

Add a `clinicType` state field, a labelled `<select>` between Phone and Domain, and include `clinic_type: clinicType || null` in the POST body. Default is empty string; "Cancel" closes without persistence.

### CSV export — `app/api/admin/leads/export/route.ts`

Add a `clinic_type` column to the header row and emit the raw snake_case value (or empty string for `NULL`). Downstream CRMs map snake_case cleanly; humans get the labels in the admin UI.

## Error handling

| Surface | Bad input | Behaviour |
|---|---|---|
| Public form | Empty select | Treated as omitted, stored `NULL`, lead succeeds |
| Public form | DOM tampering with invalid value | API returns 400, UI surfaces existing generic error toast |
| Admin manual create | Empty select | Stored `NULL` |
| Admin manual create | Tampered value | API returns 400, dialog shows error |
| Old leads | — | `NULL` in DB, `—` in UI, empty in CSV |

No new UI affordance is added for clinic-type-specific errors — the generic existing error paths cover everything.

## Testing

Extend existing test files (no new test files required):

### `tests/api/lead.test.ts`
- `POST /api/lead` with `clinic_type: "dental_implant"` → 200, row in DB has `clinicType === "dental_implant"`
- `POST /api/lead` with no `clinic_type` → 200, row has `clinicType === null`
- `POST /api/lead` with `clinic_type: "invalid"` → 400

### `tests/api/admin-leads.test.ts`
- Manual create with valid `clinic_type` → persisted
- Manual create with omitted `clinic_type` → `null`
- Manual create with invalid value → 400

### `tests/lib/csv.test.ts`
- Export contains `clinic_type` column in the header
- Rows with `NULL` clinic_type emit empty string for that column
- Rows with a value emit the snake_case form

No unit tests for the React components — they're thin pass-throughs over the existing patterns and would be tested manually in the browser before push.

## Files touched

**New:**
- `lib/leads/clinic-types.ts`
- `lib/db/migrations/0001_clinic_type.sql`

**Modified:**
- `lib/db/schema.ts`
- `lib/db/leads.ts`
- `app/api/lead/route.ts`
- `app/api/admin/leads/route.ts`
- `app/api/admin/leads/export/route.ts`
- `lib/csv.ts`
- `app/_sections/OrderForm.tsx`
- `app/admin/leads/_components/LeadsTable.tsx`
- `app/admin/leads/_components/LeadDetailDrawer.tsx`
- `app/admin/leads/_components/NewLeadDialog.tsx`
- `tests/api/lead.test.ts`
- `tests/api/admin-leads.test.ts`
- `tests/lib/csv.test.ts`

## Build order

1. Source of truth: `lib/leads/clinic-types.ts`
2. DB layer: migration, `schema.ts`, `lib/db/leads.ts` input type
3. API: `/api/lead`, `/api/admin/leads` POST handlers
4. Public form: `OrderForm.tsx`
5. Admin UI: `NewLeadDialog`, `LeadsTable`, `LeadDetailDrawer`
6. CSV export route
7. Tests update
8. Local verification: typecheck, tests, build, manual browser walk-through (submit form with + without value, check DB row, check admin display, check CSV)

## Backlog (out of scope, tracked separately)

These came up in the same brainstorming session and were explicitly deferred to their own spec/plan cycles:

1. Hide / restore for individual titles & texts on the landing (option A: soft-hide flag)
2. Inline text formatting in the landing editor (color, bold, italic, underline)
3. Section spacing control (per-section gap)
4. Video upload bug investigation
5. New section types (e.g. "Shortcuts") + section type registry extension
