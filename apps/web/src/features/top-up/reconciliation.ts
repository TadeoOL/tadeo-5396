import type { ChargeResponse } from "@snailrace/contracts";
import { useEffect, useSyncExternalStore } from "react";
import type { ApiResult } from "@/api/http";
import { lookUpCharge } from "@/api/snailpay";
import {
  markPendingAsUnknown,
  readLedger,
  settleTopUp,
  type TopUp,
} from "@/storage/ledger";
import { readSession } from "@/storage/session";
import { announceOutcome } from "./announce";

// ponytail: no jitter; add it if many clients ever reconcile against one server.
export const BACKOFF_MS = [2_000, 4_000, 8_000, 16_000, 32_000];

export function outcomeOfLookup(
  result: ApiResult<ChargeResponse>,
  topUp: Pick<TopUp, "id" | "createdAt">,
  now: number,
): {
  outcome: "credited" | "declined" | "failed";
  charge: ChargeResponse;
} | null {
  if (result.kind !== "response" || result.body.reference !== topUp.id)
    return null;
  const charge = result.body;
  if (result.status === 200 && charge.status === "approved")
    return { outcome: "credited", charge };
  if (result.status === 200 && charge.status === "rejected")
    return { outcome: "declined", charge };
  if (result.status === 404 && now - Date.parse(topUp.createdAt) > 120_000)
    return { outcome: "failed", charge };
  return null;
}

export type ReconciliationRun = { attempt: number; checking: boolean };

let runs: ReadonlyMap<string, ReconciliationRun> = new Map();
const listeners = new Set<() => void>();

function setRun(topUpId: string, run: ReconciliationRun | null): void {
  const next = new Map(runs);
  if (run) next.set(topUpId, run);
  else next.delete(topUpId);
  runs = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useReconciliationRuns(): ReadonlyMap<
  string,
  ReconciliationRun
> {
  return useSyncExternalStore(subscribe, () => runs);
}

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

async function run(userId: string, topUpId: string): Promise<void> {
  let retryAfterMs = 0;
  for (let n = 1; n <= BACKOFF_MS.length; n++) {
    setRun(topUpId, { attempt: n, checking: true });
    await wait(Math.max(BACKOFF_MS[n - 1]!, retryAfterMs));
    const topUp = readLedger(userId).topUps.find((t) => t.id === topUpId);
    if (topUp?.outcome !== "unknown") return setRun(topUpId, null);
    const result = await lookUpCharge(topUpId);
    const settled = outcomeOfLookup(result, topUp, Date.now());
    if (settled) {
      const { outcome, charge } = settled;
      const session = readSession();
      if (
        settleTopUp(userId, topUpId, outcome, charge) &&
        session.status === "signed-in" &&
        session.user.id === userId
      )
        announceOutcome({ amountCents: topUp.amountCents, outcome, charge });
      return setRun(topUpId, null);
    }
    retryAfterMs =
      result.kind === "response" &&
      (result.status === 503 || result.status === 429)
        ? Number(result.headers.get("Retry-After")) * 1000 || 0
        : 0;
  }
  setRun(topUpId, { attempt: BACKOFF_MS.length, checking: false });
}

export function reconcile(userId: string, topUpId: string): void {
  if (runs.get(topUpId)?.checking) return;
  run(userId, topUpId).catch(() => setRun(topUpId, null));
}

export function useResumeReconciliation(userId: string): void {
  useEffect(() => {
    markPendingAsUnknown(userId);
    for (const topUp of readLedger(userId).topUps)
      if (topUp.outcome === "unknown") reconcile(userId, topUp.id);
  }, [userId]);
}
