import type { ChargeResponse, ChargeStatusDetail } from "@snailrace/contracts";
import type { TopUp } from "@/storage/ledger";

export type OutcomeCopy = { title: string; body: string; shortReason: string };

const PAYMENT_ERROR: OutcomeCopy = {
  title: "Something went wrong with this payment",
  body: "Nothing was charged. Try again.",
  shortReason: "Payment error",
};

export const OUTCOME_COPY: Record<
  Exclude<ChargeStatusDetail, "accredited">,
  OutcomeCopy
> = {
  cc_rejected_bad_filled_card_number: {
    title: "Declined: card not recognized",
    body: "Check the card number and try again.",
    shortReason: "Card not recognized",
  },
  cc_rejected_bad_filled_date: {
    title: "Declined: wrong expiry date",
    body: "Check the expiry date on the card.",
    shortReason: "Wrong expiry date",
  },
  cc_rejected_bad_filled_security_code: {
    title: "Declined: wrong security code",
    body: "Check the 3-digit code on the back of the card.",
    shortReason: "Wrong security code",
  },
  cc_rejected_insufficient_amount: {
    title: "Declined: insufficient funds",
    body: "The card doesn't have enough funds. Try a smaller amount or another card.",
    shortReason: "Insufficient funds",
  },
  cc_rejected_high_risk: {
    title: "Declined for security reasons",
    body: "SnailPay declined this payment to protect you. Use another card.",
    shortReason: "Declined for security",
  },
  service_unavailable: {
    title: "SnailPay is unavailable",
    body: "Nothing was charged and your balance did not change. Try again in a few moments.",
    shortReason: "SnailPay was unavailable",
  },
  rate_limited: {
    title: "Too many attempts",
    body: "Nothing was charged. Wait a minute and try again.",
    shortReason: "Too many attempts",
  },
  internal_error: {
    title: "SnailPay couldn't process the payment",
    body: "Nothing was charged and your balance did not change. Try again.",
    shortReason: "SnailPay error",
  },
  invalid_request: PAYMENT_ERROR,
  idempotency_key_reused: PAYMENT_ERROR,
  charge_not_found: {
    title: "Payment not found",
    body: "SnailPay has no record of this payment, so nothing was charged.",
    shortReason: "No record at SnailPay",
  },
};

export function copyOf(charge: ChargeResponse | undefined): OutcomeCopy {
  const detail = charge?.status_detail;
  return !detail || detail === "accredited"
    ? OUTCOME_COPY.internal_error
    : OUTCOME_COPY[detail];
}

export const MISMATCHED_FIELD: Partial<
  Record<ChargeStatusDetail, "cardNumber" | "expiry" | "cvv">
> = {
  cc_rejected_bad_filled_card_number: "cardNumber",
  cc_rejected_bad_filled_date: "expiry",
  cc_rejected_bad_filled_security_code: "cvv",
};

export function shortReason(topUp: TopUp): string | null {
  switch (topUp.outcome) {
    case "credited":
      return `Auth. code ${topUp.charge?.authorization_code ?? ""}`;
    case "declined":
    case "failed":
      return copyOf(topUp.charge).shortReason;
    case "unknown":
      return "Not confirmed yet.";
    case "pending":
      return null;
  }
}
