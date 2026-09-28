import type { ChargeResponse } from "@snailrace/contracts";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { ApiResult } from "@/api/http";
import { setBackend } from "@/storage/backend";
import { readLedger, settleTopUp, startTopUp } from "@/storage/ledger";
import { createMemoryStorage } from "@/storage/memory-storage";
import { outcomeOfLookup, reconcile } from "./reconciliation";

const userId = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const now = "2026-09-28T12:00:00.000Z";

const approved = (reference: string): ChargeResponse => ({
  id: "0b7e2f0e-6a1d-4f7b-9d43-2a1c5e9f8b10",
  status: "approved",
  status_detail: "accredited",
  transaction_amount: 15000,
  date_created: now,
  authorization_code: "482915",
  reference,
  payer_id: userId,
  payer_email: "ana@example.com",
  card: {
    card_number: "1234123412341234",
    expiration_date: "12/26",
    security_code: "543",
    cardholder_name: "Ana López",
  },
});

const errorBody = (
  reference: string,
  status_detail: string,
): ChargeResponse => ({
  ...approved(reference),
  id: null,
  status: "error",
  status_detail: status_detail as ChargeResponse["status_detail"],
  date_created: null,
  authorization_code: null,
});

const response = (
  status: number,
  body: ChargeResponse,
  headers: Record<string, string> = {},
): ApiResult<ChargeResponse> => ({
  kind: "response",
  status,
  headers: new Headers(headers),
  body,
});

beforeEach(() => {
  setBackend(createMemoryStorage());
  vi.useFakeTimers();
  vi.setSystemTime(new Date(now));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

type Answer = (reference: string) => Response | Promise<Response>;

function stubLookups(...answers: Answer[]) {
  const fetchMock = vi.fn((input: string) => {
    const reference = new URL(input, "http://x").searchParams.get("reference")!;
    const answer =
      answers[Math.min(fetchMock.mock.calls.length - 1, answers.length - 1)]!;
    return Promise.resolve(answer(reference));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function unknownTopUp(): string {
  const id = crypto.randomUUID();
  startTopUp(userId, { id, amountCents: 15000 });
  settleTopUp(userId, id, "unknown");
  return id;
}

const topUpOf = (id: string) =>
  readLedger(userId).topUps.find((t) => t.id === id);

test("maps every lookup result", () => {
  const id = crypto.randomUUID();
  const topUp = { id, createdAt: now };
  const t = Date.parse(now);
  expect(outcomeOfLookup(response(200, approved(id)), topUp, t)).toEqual({
    outcome: "credited",
    charge: approved(id),
  });
  const rejected = {
    ...approved(id),
    status: "rejected",
    status_detail: "cc_rejected_insufficient_amount",
    authorization_code: null,
  } as ChargeResponse;
  expect(outcomeOfLookup(response(200, rejected), topUp, t)).toEqual({
    outcome: "declined",
    charge: rejected,
  });
  const notFound = errorBody(id, "charge_not_found");
  expect(outcomeOfLookup(response(404, notFound), topUp, t)).toBeNull();
  expect(
    outcomeOfLookup(
      response(404, notFound),
      { id, createdAt: "2026-09-28T11:57:59.999Z" },
      t,
    ),
  ).toEqual({ outcome: "failed", charge: notFound });
  expect(
    outcomeOfLookup(
      response(404, notFound),
      { id, createdAt: "2026-09-28T11:58:00.000Z" },
      t,
    ),
  ).toBeNull();
  for (const result of [
    response(503, errorBody(id, "service_unavailable")),
    response(500, errorBody(id, "internal_error")),
    response(429, errorBody(id, "rate_limited")),
    { kind: "timeout" },
    { kind: "aborted" },
    { kind: "network-error" },
    { kind: "unparseable", status: 502 },
    response(200, approved(crypto.randomUUID())),
  ] as ApiResult<ChargeResponse>[])
    expect(outcomeOfLookup(result, topUp, t)).toBeNull();
});

test("credits an approved Charge found by the lookup and stops", async () => {
  const fetchMock = stubLookups((ref) => Response.json(approved(ref)));
  const id = unknownTopUp();
  reconcile(userId, id);
  await vi.advanceTimersByTimeAsync(1_999);
  expect(fetchMock).toHaveBeenCalledTimes(0);
  await vi.advanceTimersByTimeAsync(1);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(topUpOf(id)).toMatchObject({
    outcome: "credited",
    charge: approved(id),
  });
  expect(readLedger(userId).balanceCents).toBe(15000);
  await vi.advanceTimersByTimeAsync(60_000);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("tries 5 times at 2, 4, 8, 16 and 32 s, then leaves the Top-up Unknown", async () => {
  const fetchMock = vi.fn(() =>
    Promise.reject(new TypeError("Failed to fetch")),
  );
  vi.stubGlobal("fetch", fetchMock);
  const id = unknownTopUp();
  reconcile(userId, id);
  let elapsed = 0;
  for (const [at, count] of [
    [1_999, 0],
    [2_000, 1],
    [5_999, 1],
    [6_000, 2],
    [14_000, 3],
    [30_000, 4],
    [62_000, 5],
    [182_000, 5],
  ] as const) {
    await vi.advanceTimersByTimeAsync(at - elapsed);
    elapsed = at;
    expect(fetchMock).toHaveBeenCalledTimes(count);
  }
  expect(topUpOf(id)?.outcome).toBe("unknown");
});

test("waits for Retry-After when it is longer than the backoff step", async () => {
  const fetchMock = stubLookups(
    (ref) =>
      Response.json(errorBody(ref, "service_unavailable"), {
        status: 503,
        headers: { "Retry-After": "30" },
      }),
    (ref) => Response.json(approved(ref)),
  );
  const id = unknownTopUp();
  reconcile(userId, id);
  await vi.advanceTimersByTimeAsync(31_999);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(topUpOf(id)?.outcome).toBe("credited");
});

test("keeps a Top-up Unknown on a 429 lookup and honors its Retry-After", async () => {
  const fetchMock = stubLookups(
    (ref) =>
      Response.json(errorBody(ref, "rate_limited"), {
        status: 429,
        headers: { "Retry-After": "10" },
      }),
    (ref) => Response.json(approved(ref)),
  );
  const id = unknownTopUp();
  reconcile(userId, id);
  await vi.advanceTimersByTimeAsync(11_999);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(topUpOf(id)?.outcome).toBe("unknown");
  await vi.advanceTimersByTimeAsync(1);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(topUpOf(id)?.outcome).toBe("credited");
});

test("settles a 404 as Failed only after 2 minutes", async () => {
  vi.setSystemTime(new Date("2026-09-28T11:58:30.000Z"));
  const id = unknownTopUp();
  vi.setSystemTime(new Date(now));
  const fetchMock = stubLookups((ref) =>
    Response.json(errorBody(ref, "charge_not_found"), { status: 404 }),
  );
  reconcile(userId, id);
  await vi.advanceTimersByTimeAsync(30_000);
  expect(fetchMock).toHaveBeenCalledTimes(4);
  expect(topUpOf(id)?.outcome).toBe("unknown");
  await vi.advanceTimersByTimeAsync(32_000);
  expect(fetchMock).toHaveBeenCalledTimes(5);
  expect(topUpOf(id)).toMatchObject({
    outcome: "failed",
    settledAt: "2026-09-28T12:01:02.000Z",
  });
  expect(topUpOf(id)?.charge?.status_detail).toBe("charge_not_found");
});

test("stops when the Top-up was settled elsewhere", async () => {
  const fetchMock = vi.fn(() =>
    Promise.reject(new TypeError("Failed to fetch")),
  );
  vi.stubGlobal("fetch", fetchMock);
  const id = unknownTopUp();
  reconcile(userId, id);
  await vi.advanceTimersByTimeAsync(2_000);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  settleTopUp(userId, id, "credited", approved(id));
  await vi.advanceTimersByTimeAsync(60_000);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("runs once per Top-up", async () => {
  const fetchMock = stubLookups((ref) => Response.json(approved(ref)));
  const id = unknownTopUp();
  reconcile(userId, id);
  reconcile(userId, id);
  await vi.advanceTimersByTimeAsync(2_000);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
