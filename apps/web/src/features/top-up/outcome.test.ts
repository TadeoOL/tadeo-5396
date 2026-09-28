import type { ChargeResponse } from "@snailrace/contracts";
import { beforeEach, expect, test } from "vitest";
import type { ApiResult } from "@/api/http";
import { setBackend } from "@/storage/backend";
import { createMemoryStorage } from "@/storage/memory-storage";
import { outcomeOfCharge } from "./outcome";

const topUpId = "5f1c3a8e-2d4b-4c6e-8f9a-1b2c3d4e5f60";

beforeEach(() => setBackend(createMemoryStorage()));

function charge(
  status: ChargeResponse["status"],
  status_detail: ChargeResponse["status_detail"],
  reference = topUpId,
): ChargeResponse {
  return {
    id: null,
    status,
    status_detail,
    transaction_amount: 15000,
    date_created: null,
    authorization_code: null,
    reference,
    payer_id: null,
    payer_email: null,
    card: {
      card_number: null,
      expiration_date: null,
      security_code: null,
      cardholder_name: null,
    },
  };
}

function response(
  status: number,
  body: ChargeResponse,
): ApiResult<ChargeResponse> {
  return { kind: "response", status, headers: new Headers(), body };
}

test("an approved Charge settles as Credited", () => {
  const body = charge("approved", "accredited");
  expect(outcomeOfCharge(response(201, body), topUpId)).toStrictEqual({
    outcome: "credited",
    charge: body,
  });
});

test("a rejected Charge settles as Declined", () => {
  const body = charge("rejected", "cc_rejected_insufficient_amount");
  expect(outcomeOfCharge(response(402, body), topUpId)).toStrictEqual({
    outcome: "declined",
    charge: body,
  });
});

test("503, 500 and 429 with a SnailPay body settle as Failed", () => {
  const cases = [
    [503, "service_unavailable"],
    [500, "internal_error"],
    [429, "rate_limited"],
  ] as const;
  for (const [status, detail] of cases) {
    const body = charge("error", detail);
    expect(outcomeOfCharge(response(status, body), topUpId)).toStrictEqual({
      outcome: "failed",
      charge: body,
    });
  }
});

test("400 and 422 with a SnailPay body settle as Failed", () => {
  const cases = [
    [400, "invalid_request"],
    [422, "idempotency_key_reused"],
  ] as const;
  for (const [status, detail] of cases) {
    const body = charge("error", detail);
    expect(outcomeOfCharge(response(status, body), topUpId)).toStrictEqual({
      outcome: "failed",
      charge: body,
    });
  }
});

test("a timeout, an abort or a network error leaves the Top-up Unknown", () => {
  for (const kind of ["timeout", "aborted", "network-error"] as const) {
    expect(outcomeOfCharge({ kind }, topUpId)).toStrictEqual({
      outcome: "unknown",
    });
  }
});

test("an unparseable body leaves the Top-up Unknown", () => {
  expect(
    outcomeOfCharge({ kind: "unparseable", status: 502 }, topUpId),
  ).toStrictEqual({ outcome: "unknown" });
});

test("a Charge for another reference leaves the Top-up Unknown", () => {
  const body = charge(
    "approved",
    "accredited",
    "0b7e2f0e-6a1d-4f7b-9d43-2a1c5e9f8b10",
  );
  expect(outcomeOfCharge(response(201, body), topUpId)).toStrictEqual({
    outcome: "unknown",
  });
});

test("any other status leaves the Top-up Unknown", () => {
  const approved = charge("approved", "accredited");
  const rejected = charge("rejected", "cc_rejected_high_risk");
  expect(outcomeOfCharge(response(200, approved), topUpId)).toStrictEqual({
    outcome: "unknown",
  });
  expect(outcomeOfCharge(response(201, rejected), topUpId)).toStrictEqual({
    outcome: "unknown",
  });
});
