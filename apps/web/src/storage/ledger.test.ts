import type { ChargeResponse } from "@snailrace/contracts";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { getBackend, setBackend } from "./backend";
import { UnreadableDataError } from "./errors";
import {
  markPendingAsUnknown,
  readLedger,
  settleTopUp,
  startTopUp,
  type TopUpOutcome,
} from "./ledger";
import { createMemoryStorage } from "./memory-storage";
import { subscribe } from "./subscribe";

const user = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const other = "0b7e2f0e-6a1d-4f7b-9d43-2a1c5e9f8b10";
const id = "5f1c3a8e-2d4b-4c6e-8f9a-1b2c3d4e5f60";
const key = `snailrace.v1.ledger.${user}`;
const now = "2026-09-28T12:00:00.000Z";

const charge: ChargeResponse = {
  id: "0b7e2f0e-6a1d-4f7b-9d43-2a1c5e9f8b10",
  status: "approved",
  status_detail: "accredited",
  transaction_amount: 15000,
  date_created: now,
  authorization_code: "123456",
  reference: id,
  payer_id: user,
  payer_email: "ana@example.com",
  card: {
    card_number: "************1234",
    expiration_date: "12/26",
    security_code: "***",
    cardholder_name: "Ana López",
  },
};

beforeEach(() => {
  setBackend(createMemoryStorage());
  vi.useFakeTimers();
  vi.setSystemTime(new Date(now));
});
afterEach(() => vi.useRealTimers());

function stored(): string | null {
  return getBackend().getItem(key);
}

test("startTopUp appends a pending Top-up without touching the Balance", () => {
  startTopUp(user, { id, amountCents: 15000 });
  expect(readLedger(user)).toStrictEqual({
    balanceCents: 0,
    topUps: [{ id, amountCents: 15000, createdAt: now, outcome: "pending" }],
  });
});

test("settleTopUp applies every allowed transition", () => {
  const moves: [TopUpOutcome[], Exclude<TopUpOutcome, "pending">][] = [
    [[], "credited"],
    [[], "declined"],
    [[], "failed"],
    [[], "unknown"],
    [["unknown"], "credited"],
    [["unknown"], "declined"],
    [["unknown"], "failed"],
  ];
  for (const [before, outcome] of moves) {
    setBackend(createMemoryStorage());
    startTopUp(user, { id, amountCents: 15000 });
    for (const step of before) {
      expect(settleTopUp(user, id, step as "unknown")).toBe(true);
    }
    expect(settleTopUp(user, id, outcome, charge)).toBe(true);
    const [topUp] = readLedger(user).topUps;
    expect(topUp?.outcome).toBe(outcome);
    expect(topUp?.charge).toEqual(charge);
    expect(topUp?.settledAt).toBe(outcome === "unknown" ? undefined : now);
  }
});

test("settleTopUp refuses a transition out of a final outcome", () => {
  const outcomes = ["credited", "declined", "failed", "unknown"] as const;
  for (const final of ["credited", "declined", "failed"] as const) {
    setBackend(createMemoryStorage());
    startTopUp(user, { id, amountCents: 15000 });
    settleTopUp(user, id, final);
    const before = stored();
    for (const outcome of outcomes) {
      expect(settleTopUp(user, id, outcome, charge)).toBe(false);
    }
    expect(stored()).toBe(before);
  }
  const before = stored();
  expect(settleTopUp(user, other, "credited")).toBe(false);
  expect(stored()).toBe(before);
});

test("only the move into credited adds to the Balance", () => {
  startTopUp(user, { id, amountCents: 15000 });
  settleTopUp(user, id, "declined");
  expect(readLedger(user).balanceCents).toBe(0);
  setBackend(createMemoryStorage());
  startTopUp(user, { id, amountCents: 15000 });
  settleTopUp(user, id, "credited");
  expect(readLedger(user).balanceCents).toBe(15000);
  startTopUp(user, { id: other, amountCents: 5000 });
  settleTopUp(user, other, "unknown");
  expect(readLedger(user).balanceCents).toBe(15000);
  settleTopUp(user, other, "credited");
  expect(readLedger(user).balanceCents).toBe(20000);
});

test("settling an already-credited Top-up again is a no-op", () => {
  startTopUp(user, { id, amountCents: 15000 });
  expect(settleTopUp(user, id, "credited", charge)).toBe(true);
  expect(settleTopUp(user, id, "credited", charge)).toBe(false);
  expect(readLedger(user).balanceCents).toBe(15000);
});

test("reads a missing ledger as $0", () => {
  expect(readLedger(user)).toEqual({ balanceCents: 0, topUps: [] });
  expect(getBackend().length).toBe(0);
});

test("raises UnreadableDataError for invalid ledger data", () => {
  for (const raw of ["not json", '{"balanceCents":-1,"topUps":[]}']) {
    getBackend().setItem(key, raw);
    expect(() => readLedger(user)).toThrow(UnreadableDataError);
    try {
      readLedger(user);
    } catch (error) {
      expect((error as UnreadableDataError).key).toBe(key);
    }
  }
});

test("raises UnreadableDataError when the Balance breaks the invariant", () => {
  getBackend().setItem(key, '{"balanceCents":500,"topUps":[]}');
  expect(() => readLedger(user)).toThrow(UnreadableDataError);
});

test("returns the same ledger object while the stored value is unchanged", () => {
  expect(readLedger(user)).toBe(readLedger(user));
  startTopUp(user, { id, amountCents: 15000 });
  const first = readLedger(user);
  expect(readLedger(user)).toBe(first);
  settleTopUp(user, id, "credited");
  expect(readLedger(user)).not.toBe(first);
});

test("notifies subscribers on a write and on a storage event for the ledger key", () => {
  const listener = vi.fn();
  const unsubscribe = subscribe(listener);
  startTopUp(user, { id, amountCents: 15000 });
  expect(listener).toHaveBeenCalledTimes(1);
  window.dispatchEvent(new StorageEvent("storage", { key }));
  expect(listener).toHaveBeenCalledTimes(2);
  unsubscribe();
});

test("a Top-up for one User leaves another User's ledger untouched", () => {
  startTopUp(user, { id, amountCents: 15000 });
  expect(getBackend().getItem(`snailrace.v1.ledger.${other}`)).toBeNull();
  expect(readLedger(other)).toEqual({ balanceCents: 0, topUps: [] });
});

test("lets a failed write propagate and changes nothing", () => {
  const backend = createMemoryStorage();
  backend.setItem = () => {
    throw new DOMException("full", "QuotaExceededError");
  };
  setBackend(backend);
  expect(() => startTopUp(user, { id, amountCents: 15000 })).toThrow("full");
  expect(readLedger(user)).toEqual({ balanceCents: 0, topUps: [] });
});

test("markPendingAsUnknown turns every pending Top-up Unknown on load", () => {
  const ids = [crypto.randomUUID(), id, crypto.randomUUID()];
  for (const topUpId of ids)
    startTopUp(user, { id: topUpId, amountCents: 1000 });
  settleTopUp(user, id, "credited", charge);
  markPendingAsUnknown(user);
  const ledger = readLedger(user);
  expect(ledger.topUps.map((t) => t.outcome)).toEqual([
    "unknown",
    "credited",
    "unknown",
  ]);
  expect(ledger.balanceCents).toBe(1000);
  expect(ledger.topUps[0]?.settledAt).toBeUndefined();
  expect(ledger.topUps[2]?.settledAt).toBeUndefined();
  const raw = stored();
  markPendingAsUnknown(user);
  expect(stored()).toBe(raw);
  expect(readLedger(user)).toBe(ledger);
});
