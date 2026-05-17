// lib/leads/clinic-types.ts
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
