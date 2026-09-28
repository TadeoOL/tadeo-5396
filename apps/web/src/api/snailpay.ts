import { ChargeResponse, type ChargeRequest } from "@snailrace/contracts";
import { request, type ApiResult } from "./http";

export const SNAILPAY_TIMEOUT_MS = 10_000;

export function createCharge(
  charge: ChargeRequest,
  idempotencyKey: string,
): Promise<ApiResult<ChargeResponse>> {
  return request("/api/snailpay/charges", ChargeResponse, {
    method: "POST",
    headers: { "X-Idempotency-Key": idempotencyKey },
    json: charge,
    timeoutMs: SNAILPAY_TIMEOUT_MS,
  });
}
