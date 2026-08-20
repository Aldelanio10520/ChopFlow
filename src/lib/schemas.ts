import { z } from "zod";
import { sanitizeText } from "./sanitize";

const text = (max: number) =>
  z
    .string()
    .transform((value) => sanitizeText(value, max))
    .pipe(z.string().min(1).max(max));

const optionalText = (max: number) =>
  z
    .string()
    .optional()
    .transform((value) => sanitizeText(value ?? "", max))
    .pipe(z.string().max(max));

export const customerSchema = z.object({
  name: text(120),
  contact_name: optionalText(80),
  phone: optionalText(30),
  address: optionalText(160),
  district: optionalText(80),
  city: optionalText(80),
  state: optionalText(2),
  zip: optionalText(12),
  notes: optionalText(500),
});

export const serviceSchema = z.object({
  name: text(80),
  kind: z.enum(["emergencial", "preventiva", "sanitizacao", "instalacao"]),
});

export const partSchema = z.object({
  name: text(80),
  unit: z
    .string()
    .optional()
    .transform((value) => sanitizeText(value ?? "", 12) || "un"),
});

export const routeSchema = z.object({
  technician_id: z.string().uuid(),
  route_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: text(80),
  notes: optionalText(500),
});

export const workOrderStopSchema = z.object({
  customer_id: z.string().uuid(),
  service_id: z.string().uuid().optional().or(z.literal("")),
  kind: z.enum(["emergencial", "preventiva", "sanitizacao", "instalacao"]),
  description: optionalText(500),
});

export const equipmentSchema = z.object({
  type: text(60),
  brand: optionalText(60),
  model: optionalText(60),
  serial_number: text(60),
  voltage: optionalText(20),
  refrigerant: optionalText(20),
  taps: z
    .string()
    .optional()
    .transform((value) => {
      const n = Number(value);
      return Number.isFinite(n) && n > 0 ? n : null;
    }),
  extractor_type: optionalText(60),
  notes: optionalText(500),
});
