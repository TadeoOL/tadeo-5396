import { z } from "zod";

export const Uuid = z.uuid();
export const IsoDate = z.iso.date();

export const ErrorEnvelope = z.object({
  error: z.object({ code: z.string(), message: z.string(), requestId: Uuid }),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelope>;

export const OutageState = z.strictObject({ active: z.boolean() });
export type OutageState = z.infer<typeof OutageState>;

export const HealthResponse = z.object({ status: z.literal("ok") });
export type HealthResponse = z.infer<typeof HealthResponse>;

export const MIN_TOP_UP_CENTS = 1;
export const MAX_TOP_UP_CENTS = 1_000_000;

export const ScenarioCard = z.enum([
  "1234123412341234",
  "1234123412340002",
  "1234123412340003",
  "1234123412340004",
]);
export type ScenarioCard = z.infer<typeof ScenarioCard>;

export const ChargeRequest = z.object({
  card_number: z.string().regex(/^\d{16}$/),
  expiration_date: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/),
  security_code: z.string().regex(/^\d{3}$/),
  cardholder_name: z.string().trim().min(1).max(100),
  transaction_amount: z.int().min(MIN_TOP_UP_CENTS).max(MAX_TOP_UP_CENTS),
  payer_id: Uuid,
  payer_email: z
    .string()
    .max(254)
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
});
export type ChargeRequest = z.infer<typeof ChargeRequest>;

export const ChargeStatusDetail = z.enum([
  "accredited",
  "cc_rejected_bad_filled_card_number",
  "cc_rejected_bad_filled_date",
  "cc_rejected_bad_filled_security_code",
  "cc_rejected_insufficient_amount",
  "cc_rejected_high_risk",
  "invalid_request",
  "idempotency_key_reused",
  "service_unavailable",
  "rate_limited",
  "internal_error",
  "charge_not_found",
]);
export type ChargeStatusDetail = z.infer<typeof ChargeStatusDetail>;

export const ChargeResponse = z.object({
  id: Uuid.nullable(),
  status: z.enum(["approved", "rejected", "error"]),
  status_detail: ChargeStatusDetail,
  transaction_amount: z.int().nullable(),
  date_created: z.iso.datetime().nullable(),
  authorization_code: z
    .string()
    .regex(/^\d{6}$/)
    .nullable(),
  reference: z.string().nullable(),
  payer_id: z.string().nullable(),
  payer_email: z.string().nullable(),
  card: z.object({
    card_number: z.string().nullable(),
    expiration_date: z.string().nullable(),
    security_code: z.string().nullable(),
    cardholder_name: z.string().nullable(),
  }),
  errors: z
    .array(z.object({ field: z.string(), message: z.string() }))
    .optional(),
});
export type ChargeResponse = z.infer<typeof ChargeResponse>;
