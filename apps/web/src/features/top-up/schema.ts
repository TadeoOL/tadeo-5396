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
        "Enter an amount from $0.01 to $10,000.00.",
      ),
    cardNumber: z
      .string()
      .refine(
        (v) => accepts(fields.card_number)(v.replaceAll(" ", "")),
        "Enter the 16 digits of the card.",
      ),
    expiry: z.string().refine(accepts(fields.expiration_date), "Use MM/YY."),
    cvv: z.string().refine(accepts(fields.security_code), "Enter 3 digits."),
    cardholderName: z
      .string()
      .refine(
        accepts(fields.cardholder_name),
        "Enter the name on the card (up to 100 characters).",
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
