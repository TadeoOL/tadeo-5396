import type { ChargeResponse, ChargeStatusDetail } from "@snailrace/contracts";
import type { TopUp } from "@/storage/ledger";

export type OutcomeCopy = { title: string; body: string; shortReason: string };

const PAYMENT_ERROR: OutcomeCopy = {
  title: "Algo salió mal con este pago",
  body: "No se cobró nada. Intenta de nuevo.",
  shortReason: "Error en el pago",
};

export const OUTCOME_COPY: Record<
  Exclude<ChargeStatusDetail, "accredited">,
  OutcomeCopy
> = {
  cc_rejected_bad_filled_card_number: {
    title: "Rechazada: tarjeta no reconocida",
    body: "Revisa el número de tarjeta e intenta de nuevo.",
    shortReason: "Tarjeta no reconocida",
  },
  cc_rejected_bad_filled_date: {
    title: "Rechazada: fecha de vencimiento incorrecta",
    body: "Revisa la fecha de vencimiento de la tarjeta.",
    shortReason: "Fecha de vencimiento incorrecta",
  },
  cc_rejected_bad_filled_security_code: {
    title: "Rechazada: código de seguridad incorrecto",
    body: "Revisa el código de 3 dígitos al reverso de la tarjeta.",
    shortReason: "Código de seguridad incorrecto",
  },
  cc_rejected_insufficient_amount: {
    title: "Rechazada: fondos insuficientes",
    body: "La tarjeta no tiene fondos suficientes. Prueba con un monto menor o con otra tarjeta.",
    shortReason: "Fondos insuficientes",
  },
  cc_rejected_high_risk: {
    title: "Rechazada por seguridad",
    body: "SnailPay rechazó este pago para protegerte. Usa otra tarjeta.",
    shortReason: "Rechazada por seguridad",
  },
  service_unavailable: {
    title: "SnailPay no está disponible",
    body: "No se cobró nada y tu saldo no cambió. Intenta de nuevo en unos momentos.",
    shortReason: "SnailPay no estaba disponible",
  },
  rate_limited: {
    title: "Demasiados intentos",
    body: "No se cobró nada. Espera un minuto e intenta de nuevo.",
    shortReason: "Demasiados intentos",
  },
  internal_error: {
    title: "SnailPay no pudo procesar el pago",
    body: "No se cobró nada y tu saldo no cambió. Intenta de nuevo.",
    shortReason: "Error de SnailPay",
  },
  invalid_request: PAYMENT_ERROR,
  idempotency_key_reused: PAYMENT_ERROR,
  charge_not_found: {
    title: "Pago no encontrado",
    body: "SnailPay no tiene registro de este pago, así que no se cobró nada.",
    shortReason: "Sin registro en SnailPay",
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
      return `Cód. de autorización ${topUp.charge?.authorization_code ?? ""}`;
    case "declined":
    case "failed":
      return copyOf(topUp.charge).shortReason;
    case "unknown":
      return "Aún sin confirmar.";
    case "pending":
      return null;
  }
}
