import type { ChargeResponse } from "@snailrace/contracts";
import type { ApiResult } from "@/api/http";
import type { TopUpOutcome } from "@/storage/ledger";

const FAILED_STATUSES = [400, 422, 429, 500, 503];

export function outcomeOfCharge(
  result: ApiResult<ChargeResponse>,
  topUpId: string,
): { outcome: Exclude<TopUpOutcome, "pending">; charge?: ChargeResponse } {
  if (result.kind !== "response" || result.body.reference !== topUpId) {
    return { outcome: "unknown" };
  }
  const { status, body } = result;
  if (status === 201 && body.status === "approved") {
    return { outcome: "credited", charge: body };
  }
  if (status === 402 && body.status === "rejected") {
    return { outcome: "declined", charge: body };
  }
  if (FAILED_STATUSES.includes(status))
    return { outcome: "failed", charge: body };
  return { outcome: "unknown" };
}
