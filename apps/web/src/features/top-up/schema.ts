import { ChargeRequest } from "@snailrace/contracts";
import { z } from "zod";

const fields = ChargeRequest.shape;

export function parseAmountCents(input: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(input.trim());
  if (!match) return null;
  const [, whole = "", fraction = ""] = match;
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return fields.transaction_amount.safeParse(cents).success ? cents : null;
}

const accepts = (schema: z.ZodType) => (v: string) =>
  schema.safeParse(v).success;

export const topUpFormSchema = z
  .object({
    amount: z
      .string()
      .refine(
        (v) => parseAmountCents(v) !== null,
        "Ingresa un monto de $0.01 a $10,000.00.",
      ),
    cardNumber: z
      .string()
      .refine(
        (v) => accepts(fields.card_number)(v.replaceAll(" ", "")),
        "Ingresa los 16 dígitos de la tarjeta.",
      ),
    expiry: z.string().refine(accepts(fields.expiration_date), "Usa MM/AA."),
    cvv: z.string().refine(accepts(fields.security_code), "Ingresa 3 dígitos."),
    cardholderName: z
      .string()
      .refine(
        accepts(fields.cardholder_name),
        "Ingresa el nombre que aparece en la tarjeta (hasta 100 caracteres).",
      ),
  })
  .transform((v) => ({
    amountCents: parseAmountCents(v.amount) ?? 0,
    card: {
      card_number: v.cardNumber.replaceAll(" ", ""),
      expiration_date: v.expiry,
      security_code: v.cvv,
      cardholder_name: v.cardholderName.trim(),
    },
  }));

export type TopUpFormInput = z.input<typeof topUpFormSchema>;
export type TopUpFormValues = z.output<typeof topUpFormSchema>;
