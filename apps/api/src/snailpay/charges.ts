import { createHash, randomInt, randomUUID } from "node:crypto";
import {
  type ChargeRequest,
  type ChargeResponse,
  type ChargeStatusDetail,
  ScenarioCard,
} from "@snailrace/contracts";
import type { ChargeStore } from "./charge-store.ts";

export type Sleep = (ms: number) => Promise<void>;
export type ChargeReply = {
  status: number;
  body: ChargeResponse;
  replayed: boolean;
};

export const TIMEOUT_SCENARIO_DELAY_MS = 30_000;
const SCENARIO_EXPIRY = "12/26";
const SCENARIO_CVV = "543";

type Card = ChargeResponse["card"];

function maskCard(card: Card): Card {
  const number = card.card_number;
  if (number !== null && (ScenarioCard.options as string[]).includes(number))
    return card;
  const masked =
    number === null
      ? null
      : number.length < 10
        ? "*".repeat(number.length)
        : number.slice(0, 6) +
          "*".repeat(number.length - 10) +
          number.slice(-4);
  return { ...card, card_number: masked, security_code: null };
}

const stringOrNull = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

export function echoCharge(
  statusDetail: ChargeStatusDetail,
  reference: unknown,
  input: unknown,
  errors?: ChargeResponse["errors"],
): ChargeResponse {
  const fields: Record<string, unknown> =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};
  const amount = fields.transaction_amount;
  return {
    id: null,
    status:
      statusDetail === "invalid_request" ||
      statusDetail === "idempotency_key_reused"
        ? "rejected"
        : "error",
    status_detail: statusDetail,
    transaction_amount:
      typeof amount === "number" && Number.isSafeInteger(amount)
        ? amount
        : null,
    date_created: null,
    authorization_code: null,
    reference: stringOrNull(reference),
    payer_id: stringOrNull(fields.payer_id),
    payer_email: stringOrNull(fields.payer_email),
    card: maskCard({
      card_number: stringOrNull(fields.card_number),
      expiration_date: stringOrNull(fields.expiration_date),
      security_code: stringOrNull(fields.security_code),
      cardholder_name: stringOrNull(fields.cardholder_name),
    }),
    ...(errors ? { errors } : {}),
  };
}

function decide(request: ChargeRequest): {
  status: 201 | 402;
  detail: ChargeStatusDetail;
} {
  const card = ScenarioCard.safeParse(request.card_number);
  if (!card.success)
    return { status: 402, detail: "cc_rejected_bad_filled_card_number" };
  if (request.expiration_date !== SCENARIO_EXPIRY)
    return { status: 402, detail: "cc_rejected_bad_filled_date" };
  if (request.security_code !== SCENARIO_CVV)
    return { status: 402, detail: "cc_rejected_bad_filled_security_code" };
  if (card.data === "1234123412340002")
    return { status: 402, detail: "cc_rejected_insufficient_amount" };
  if (card.data === "1234123412340003")
    return { status: 402, detail: "cc_rejected_high_risk" };
  return { status: 201, detail: "accredited" };
}

export async function createCharge(input: {
  store: ChargeStore;
  key: string;
  request: ChargeRequest;
  sleep: Sleep;
}): Promise<ChargeReply> {
  const { store, key, request, sleep } = input;
  const requestHash = createHash("sha256")
    .update(JSON.stringify(Object.values(request)))
    .digest("hex");
  const stored = store.get(key);
  if (stored) {
    if (stored.requestHash === requestHash)
      return { status: stored.status, body: stored.body, replayed: true };
    return {
      status: 422,
      body: echoCharge("idempotency_key_reused", key, request),
      replayed: false,
    };
  }

  const { status, detail } = decide(request);
  const body: ChargeResponse = {
    id: randomUUID(),
    status: status === 201 ? "approved" : "rejected",
    status_detail: detail,
    transaction_amount: request.transaction_amount,
    date_created: new Date().toISOString(),
    authorization_code:
      status === 201 ? String(randomInt(0, 1_000_000)).padStart(6, "0") : null,
    reference: key,
    payer_id: request.payer_id,
    payer_email: request.payer_email,
    card: maskCard({
      card_number: request.card_number,
      expiration_date: request.expiration_date,
      security_code: request.security_code,
      cardholder_name: request.cardholder_name,
    }),
  };
  store.set(key, { requestHash, status, body });
  if (request.card_number === "1234123412340004")
    await sleep(TIMEOUT_SCENARIO_DELAY_MS);
  return { status, body, replayed: false };
}
