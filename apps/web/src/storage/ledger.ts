import { ChargeResponse } from "@snailrace/contracts";
import { useSyncExternalStore } from "react";
import { z } from "zod";
import { getBackend } from "./backend";
import { UnreadableDataError } from "./errors";
import { notify, subscribe } from "./subscribe";

const TopUpOutcome = z.enum([
  "pending",
  "credited",
  "declined",
  "failed",
  "unknown",
]);

const TopUp = z.object({
  id: z.uuid(),
  amountCents: z.int().positive(),
  createdAt: z.iso.datetime(),
  outcome: TopUpOutcome,
  charge: ChargeResponse.optional(),
  settledAt: z.iso.datetime().optional(),
});

const LedgerRecord = z.object({
  balanceCents: z.int().nonnegative(),
  topUps: z.array(TopUp),
});

export type TopUpOutcome = z.infer<typeof TopUpOutcome>;
export type TopUp = z.infer<typeof TopUp>;
export type Ledger = z.infer<typeof LedgerRecord>;

const EMPTY: Ledger = Object.freeze({
  balanceCents: 0,
  topUps: Object.freeze([]) as unknown as TopUp[],
});
const cache = new Map<string, { raw: string; ledger: Ledger }>();

const keyOf = (userId: string) => `snailrace.v1.ledger.${userId}`;

export function readLedger(userId: string): Ledger {
  const key = keyOf(userId);
  const raw = getBackend().getItem(key);
  if (raw === null) return EMPTY;
  const cached = cache.get(key);
  if (cached?.raw === raw) return cached.ledger;
  let ledger: Ledger;
  try {
    ledger = LedgerRecord.parse(JSON.parse(raw));
  } catch {
    throw new UnreadableDataError(key);
  }
  const credited = ledger.topUps
    .filter((topUp) => topUp.outcome === "credited")
    .reduce((sum, topUp) => sum + topUp.amountCents, 0);
  if (credited !== ledger.balanceCents) throw new UnreadableDataError(key);
  cache.set(key, { raw, ledger });
  return ledger;
}

function write(userId: string, next: Ledger): void {
  getBackend().setItem(keyOf(userId), JSON.stringify(next));
  notify();
}

export function startTopUp(
  userId: string,
  topUp: { id: string; amountCents: number },
): void {
  const ledger = readLedger(userId);
  write(userId, {
    ...ledger,
    topUps: [
      ...ledger.topUps,
      {
        id: topUp.id,
        amountCents: topUp.amountCents,
        createdAt: new Date().toISOString(),
        outcome: "pending",
      },
    ],
  });
}

const ALLOWED: Partial<Record<TopUpOutcome, readonly TopUpOutcome[]>> = {
  pending: ["credited", "declined", "failed", "unknown"],
  unknown: ["credited", "declined", "failed"],
};

export function settleTopUp(
  userId: string,
  topUpId: string,
  outcome: Exclude<TopUpOutcome, "pending">,
  charge?: ChargeResponse,
): boolean {
  const ledger = readLedger(userId);
  const current = ledger.topUps.find((topUp) => topUp.id === topUpId);
  if (!current || !ALLOWED[current.outcome]?.includes(outcome)) return false;
  const settled: TopUp = {
    ...current,
    outcome,
    ...(charge && { charge }),
    ...(outcome !== "unknown" && { settledAt: new Date().toISOString() }),
  };
  write(userId, {
    balanceCents:
      ledger.balanceCents + (outcome === "credited" ? current.amountCents : 0),
    topUps: ledger.topUps.map((topUp) => (topUp === current ? settled : topUp)),
  });
  return true;
}

export function useLedger(userId: string): Ledger {
  return useSyncExternalStore(subscribe, () => readLedger(userId));
}
