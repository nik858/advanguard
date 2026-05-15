import type { Lead } from "@/lib/db/schema";

const COLUMNS = [
  "id",
  "email",
  "first_name",
  "phone",
  "domain",
  "source",
  "status",
  "audit_outcome",
  "created_at",
  "updated_at",
] as const;

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  let str: string;
  if (value instanceof Date) str = value.toISOString();
  else str = String(value);
  str = str.replace(/\r\n|\r|\n/g, " ");
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

export function leadsToCsv(rows: Lead[]): string {
  const header = COLUMNS.map((c) => `"${c}"`).join(",");
  const lines = rows.map((r) =>
    [
      csvCell(r.id),
      csvCell(r.email),
      csvCell(r.firstName),
      csvCell(r.phone),
      csvCell(r.domain),
      csvCell(r.source),
      csvCell(r.status),
      csvCell(r.auditOutcome),
      csvCell(r.createdAt),
      csvCell(r.updatedAt),
    ].join(","),
  );
  return "﻿" + [header, ...lines].join("\n") + "\n";
}
