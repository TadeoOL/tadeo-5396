import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import { ChargeResponse, ErrorEnvelope, Uuid } from "@snailrace/contracts";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.ts";
import { createTestDeps } from "../test-deps.ts";
import { createChargeStore } from "./charge-store.ts";
import type { Sleep } from "./charges.ts";

const KEY = "5f1c3a8e-2d4b-4c6e-8f9a-1b2c3d4e5f60";
const PATH = "/api/snailpay/charges";
const BODY = {
  card_number: "1234123412341234",
  expiration_date: "12/26",
  security_code: "543",
  cardholder_name: "Ana López",
  transaction_amount: 15000,
  payer_id: "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
  payer_email: "ana@example.com",
};

const servers: Server[] = [];

// Listen on 127.0.0.1 ourselves: request(app) listens on the [::] wildcard and
// sends to 127.0.0.1, so on macOS another process holding 127.0.0.1 on that
// same ephemeral port answers instead (issue #66).
async function setup(sleep: Sleep = vi.fn((_ms: number) => Promise.resolve())) {
  const chargeStore = createChargeStore();
  const app = createServer(createApp(createTestDeps({ chargeStore, sleep })));
  await new Promise<void>((resolve) => app.listen(0, "127.0.0.1", resolve));
  servers.push(app);
  const post = (body: object | string, key: string | null = randomUUID()) => {
    const req = request(app).post(PATH).set("Content-Type", "application/json");
    if (key !== null) req.set("X-Idempotency-Key", key);
    return req.send(body);
  };
  return { app, chargeStore, sleep, post };
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    servers
      .splice(0)
      .map((server) => new Promise((resolve) => server.close(resolve))),
  );
});

describe("POST /api/snailpay/charges", () => {
  it("approves the approval card with 201 and the full Charge shape", async () => {
    const sleep = vi.fn((_ms: number) => Promise.resolve());
    const { post } = await setup(sleep);
    const res = await post(BODY, KEY);
    expect(res.status).toBe(201);
    const body = ChargeResponse.parse(res.body);
    expect(body).toMatchObject({
      status: "approved",
      status_detail: "accredited",
      transaction_amount: 15000,
      reference: KEY,
      payer_id: BODY.payer_id,
      payer_email: BODY.payer_email,
      card: {
        card_number: "1234123412341234",
        expiration_date: "12/26",
        security_code: "543",
        cardholder_name: "Ana López",
      },
    });
    expect(Uuid.safeParse(body.id).success).toBe(true);
    expect(body.id).not.toBe(KEY);
    expect(body.date_created).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
    expect(body.authorization_code).toMatch(/^\d{6}$/);
    expect("errors" in body).toBe(false);
    expect(res.headers["idempotent-replayed"]).toBeUndefined();
    expect(sleep).not.toHaveBeenCalled();
  });

  it("declines each bad_filled Scenario with 402 and stores it", async () => {
    const { post, chargeStore } = await setup();
    const cases = [
      [
        { card_number: "1111222233334444" },
        "cc_rejected_bad_filled_card_number",
      ],
      [{ expiration_date: "11/26" }, "cc_rejected_bad_filled_date"],
      [{ security_code: "123" }, "cc_rejected_bad_filled_security_code"],
    ] as const;
    for (const [change, detail] of cases) {
      const key = randomUUID();
      const res = await post({ ...BODY, ...change }, key);
      expect(res.status).toBe(402);
      const body = ChargeResponse.parse(res.body);
      expect(body).toMatchObject({
        status: "rejected",
        status_detail: detail,
        authorization_code: null,
      });
      expect(Uuid.safeParse(body.id).success).toBe(true);
      expect(body.date_created).not.toBeNull();
      expect(chargeStore.get(key)?.status).toBe(402);
    }
  });

  it("declines insufficient funds and high risk with 402", async () => {
    const { post } = await setup();
    for (const [card, detail] of [
      ["1234123412340002", "cc_rejected_insufficient_amount"],
      ["1234123412340003", "cc_rejected_high_risk"],
    ]) {
      const res = await post({ ...BODY, card_number: card });
      expect(res.status).toBe(402);
      expect(ChargeResponse.parse(res.body).status_detail).toBe(detail);
    }
  });

  it("evaluates the catalog in order", async () => {
    const { post } = await setup();
    const cases = [
      [
        {
          card_number: "1111222233334444",
          expiration_date: "11/26",
          security_code: "123",
        },
        "cc_rejected_bad_filled_card_number",
      ],
      [
        { expiration_date: "11/26", security_code: "123" },
        "cc_rejected_bad_filled_date",
      ],
      [
        { card_number: "1234123412340002", security_code: "123" },
        "cc_rejected_bad_filled_security_code",
      ],
    ] as const;
    for (const [change, detail] of cases) {
      const res = await post({ ...BODY, ...change });
      expect(ChargeResponse.parse(res.body).status_detail).toBe(detail);
    }
  });

  it("approves the timeout card after sleeping 30000 ms", async () => {
    const sleep = vi.fn((_ms: number) => Promise.resolve());
    const { post } = await setup(sleep);
    const res = await post({ ...BODY, card_number: "1234123412340004" });
    expect(res.status).toBe(201);
    expect(ChargeResponse.parse(res.body).status).toBe("approved");
    expect(sleep).toHaveBeenCalledExactlyOnceWith(30_000);
  });

  it("answers a replay during the timeout delay at once", async () => {
    let release = () => {};
    const sleep = vi.fn(
      (_ms: number) =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const { post } = await setup(sleep);
    const body = { ...BODY, card_number: "1234123412340004" };
    const first = post(body, KEY).then((r) => r);
    await vi.waitFor(() => {
      expect(sleep).toHaveBeenCalled();
    });
    const replay = await post(body, KEY);
    expect(replay.status).toBe(201);
    expect(replay.headers["idempotent-replayed"]).toBe("true");
    release();
    const res = await first;
    expect(res.status).toBe(201);
    expect(ChargeResponse.parse(res.body).id).toBe(
      ChargeResponse.parse(replay.body).id,
    );
  });

  it("masks a card number outside the catalog and drops its CVV", async () => {
    const { post, chargeStore } = await setup();
    const masked = {
      card_number: "111122******4444",
      expiration_date: "12/26",
      security_code: null,
      cardholder_name: "Ana López",
    };
    const res = await post({ ...BODY, card_number: "1111222233334444" }, KEY);
    expect(ChargeResponse.parse(res.body).card).toEqual(masked);
    expect(chargeStore.get(KEY)?.body.card).toEqual(masked);
    const short = await post({ ...BODY, card_number: "123412341234123" });
    expect(short.status).toBe(400);
    expect(ChargeResponse.parse(short.body).card.card_number).toBe(
      "123412*****4123",
    );
    const tiny = await post({ ...BODY, card_number: "1234" });
    expect(ChargeResponse.parse(tiny.body).card.card_number).toBe("****");
  });

  it("answers 400 for a missing or non-UUID X-Idempotency-Key", async () => {
    const { post, chargeStore } = await setup();
    const res = await post(BODY, null);
    expect(res.status).toBe(400);
    expect(ChargeResponse.parse(res.body)).toMatchObject({
      status: "rejected",
      status_detail: "invalid_request",
      reference: null,
      transaction_amount: 15000,
      errors: [{ field: "X-Idempotency-Key", message: "Must be a UUID." }],
    });
    const bad = await post(BODY, "not-a-uuid");
    expect(bad.status).toBe(400);
    expect(ChargeResponse.parse(bad.body).reference).toBe("not-a-uuid");
    expect(chargeStore.size).toBe(0);
  });

  it("answers 400 in the Charge shape for malformed JSON and for a body over 10 kb", async () => {
    const { post } = await setup();
    const res = await post("{", KEY);
    expect(res.status).toBe(400);
    expect(ChargeResponse.parse(res.body)).toEqual({
      id: null,
      status: "rejected",
      status_detail: "invalid_request",
      transaction_amount: null,
      date_created: null,
      authorization_code: null,
      reference: KEY,
      payer_id: null,
      payer_email: null,
      card: {
        card_number: null,
        expiration_date: null,
        security_code: null,
        cardholder_name: null,
      },
      errors: [
        { field: "body", message: "The request body could not be read." },
      ],
    });
    const big = await post({ ...BODY, cardholder_name: "x".repeat(11 * 1024) });
    expect(big.status).toBe(400);
    expect(ChargeResponse.parse(big.body)).toMatchObject({
      status_detail: "invalid_request",
      errors: [
        { field: "body", message: "The request body could not be read." },
      ],
    });
  });

  it("lists every broken format rule in errors[]", async () => {
    const { post } = await setup();
    const res = await post({
      card_number: "1234 1234 1234 1234",
      expiration_date: "13/26",
      security_code: "54",
      cardholder_name: "   ",
      transaction_amount: 0,
      payer_id: "nope",
      payer_email: "ana@",
    });
    expect(res.status).toBe(400);
    const body = ChargeResponse.parse(res.body);
    expect(body.errors?.map((e) => e.field)).toEqual([
      "card_number",
      "expiration_date",
      "security_code",
      "cardholder_name",
      "transaction_amount",
      "payer_id",
      "payer_email",
    ]);
    expect(body.transaction_amount).toBe(0);
    for (const amount of [1000001, 150.5]) {
      const r = await post({ ...BODY, transaction_amount: amount });
      expect(r.status).toBe(400);
      expect(ChargeResponse.parse(r.body).errors?.map((e) => e.field)).toEqual([
        "transaction_amount",
      ]);
    }
  });

  it("stores no 400, so the same key works once the input is fixed", async () => {
    const { post } = await setup();
    expect((await post({ ...BODY, security_code: "54" }, KEY)).status).toBe(
      400,
    );
    const res = await post(BODY, KEY);
    expect(res.status).toBe(201);
    expect(res.headers["idempotent-replayed"]).toBeUndefined();
  });

  it("replays the same key and payload with Idempotent-Replayed", async () => {
    const { post } = await setup();
    const first = await post(BODY, KEY);
    const second = await post(BODY, KEY);
    expect([first.status, second.status]).toEqual([201, 201]);
    expect(ChargeResponse.parse(second.body)).toEqual(
      ChargeResponse.parse(first.body),
    );
    expect(first.headers["idempotent-replayed"]).toBeUndefined();
    expect(second.headers["idempotent-replayed"]).toBe("true");

    const reversed = Object.fromEntries(
      Object.entries({ ...BODY, cardholder_name: "  Ana López  " }).reverse(),
    );
    const third = await post(reversed, KEY);
    expect(third.status).toBe(201);
    expect(third.headers["idempotent-replayed"]).toBe("true");

    const key = randomUUID();
    const a = await post({ ...BODY, card_number: "1234123412340002" }, key);
    const b = await post({ ...BODY, card_number: "1234123412340002" }, key);
    expect([a.status, b.status]).toEqual([402, 402]);
    expect(ChargeResponse.parse(b.body).id).toBe(
      ChargeResponse.parse(a.body).id,
    );
  });

  it("answers 422 for the same key with another payload and keeps the original", async () => {
    const { post } = await setup();
    const first = await post(BODY, KEY);
    expect(first.status).toBe(201);
    const reused = await post({ ...BODY, transaction_amount: 20000 }, KEY);
    expect(reused.status).toBe(422);
    expect(ChargeResponse.parse(reused.body)).toMatchObject({
      status: "rejected",
      status_detail: "idempotency_key_reused",
      id: null,
      transaction_amount: 20000,
    });
    const again = await post(BODY, KEY);
    expect(again.status).toBe(201);
    expect(again.headers["idempotent-replayed"]).toBe("true");
    expect(ChargeResponse.parse(again.body).id).toBe(
      ChargeResponse.parse(first.body).id,
    );
  });

  it("limits each IP to 10 Charges a minute", async () => {
    const { post, chargeStore } = await setup();
    for (let i = 0; i < 10; i++) expect((await post(BODY)).status).toBe(201);
    const key = randomUUID();
    const res = await post(BODY, key);
    expect(res.status).toBe(429);
    expect(ChargeResponse.parse(res.body)).toMatchObject({
      status: "error",
      status_detail: "rate_limited",
      id: null,
      reference: key,
      card: { card_number: "1234123412341234" },
    });
    expect(String(res.headers["retry-after"])).toMatch(/^[1-9]\d*$/);
    expect(chargeStore.has(key)).toBe(false);
  });

  it("answers an unexpected error with 500 in the Charge shape", async () => {
    const { app, chargeStore } = await setup();
    vi.spyOn(chargeStore, "set").mockImplementation(() => {
      throw new Error("boom");
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const requestId = "0b7e2f0e-6a1d-4f7b-9d43-2a1c5e9f8b10";
    const res = await request(app)
      .post(PATH)
      .set("X-Idempotency-Key", KEY)
      .set("X-Request-Id", requestId)
      .send(BODY);
    expect(res.status).toBe(500);
    expect(ChargeResponse.parse(res.body)).toMatchObject({
      status: "error",
      status_detail: "internal_error",
      id: null,
      reference: KEY,
      transaction_amount: 15000,
    });
    expect(res.headers["x-request-id"]).toBe(requestId);
    expect(res.text).not.toContain("boom");
    expect(log).toHaveBeenCalledOnce();
    expect(chargeStore.size).toBe(0);
  });
});

const UNKNOWN = "0b7e2f0e-6a1d-4f7b-9d43-2a1c5e9f8b10";

async function outageSetup() {
  const ctx = await setup();
  const lookup = (reference?: string) =>
    request(ctx.app)
      .get(PATH)
      .query(reference === undefined ? {} : { reference });
  const outage = (body: object | string) =>
    request(ctx.app)
      .put("/api/snailpay/outage")
      .set("Content-Type", "application/json")
      .send(body);
  return { ...ctx, lookup, outage };
}

describe("GET /api/snailpay/charges and the Outage", () => {
  it("looks a Charge up by reference", async () => {
    const { post, lookup } = await outageSetup();
    const created = await post(BODY, KEY);
    const res = await lookup(KEY);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(created.body);
    expect(res.headers["idempotent-replayed"]).toBeUndefined();
    const key = randomUUID();
    await post({ ...BODY, card_number: "1234123412340002" }, key);
    const declined = await lookup(key);
    expect(declined.status).toBe(200);
    expect(ChargeResponse.parse(declined.body).status).toBe("rejected");
  });

  it("answers 404 charge_not_found for an unknown reference", async () => {
    const { lookup } = await outageSetup();
    const res = await lookup(UNKNOWN);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      id: null,
      status: "error",
      status_detail: "charge_not_found",
      transaction_amount: null,
      date_created: null,
      authorization_code: null,
      reference: UNKNOWN,
      payer_id: null,
      payer_email: null,
      card: {
        card_number: null,
        expiration_date: null,
        security_code: null,
        cardholder_name: null,
      },
    });
  });

  it("answers 400 for a missing or non-UUID reference", async () => {
    const { lookup } = await outageSetup();
    const res = await lookup("nope");
    expect(res.status).toBe(400);
    expect(ChargeResponse.parse(res.body)).toMatchObject({
      status: "rejected",
      status_detail: "invalid_request",
      reference: "nope",
      errors: [{ field: "reference", message: "Must be a UUID." }],
    });
    const missing = await lookup();
    expect(missing.status).toBe(400);
    expect(ChargeResponse.parse(missing.body).reference).toBeNull();
  });

  it("switches the Outage on and off", async () => {
    const { app, outage } = await outageSetup();
    const get = () => request(app).get("/api/snailpay/outage");
    expect((await get()).status).toBe(200);
    expect((await get()).body).toEqual({ active: false });
    const on = await outage({ active: true });
    expect(on.status).toBe(200);
    expect(on.body).toEqual({ active: true });
    expect((await get()).body).toEqual({ active: true });
    expect((await outage({ active: false })).body).toEqual({ active: false });
  });

  it("rejects any other Outage body with 400 in the error envelope", async () => {
    const { outage } = await outageSetup();
    for (const body of [
      { active: "yes" },
      {},
      { active: true, extra: 1 },
      "{",
    ]) {
      const res = await outage(body);
      expect(res.status).toBe(400);
      expect(ErrorEnvelope.parse(res.body).error.code).toBe("invalid_request");
    }
  });

  it("answers 503 with Retry-After on both Charge routes during the Outage", async () => {
    const { post, lookup, outage } = await outageSetup();
    await outage({ active: true });
    const res = await post(BODY, KEY);
    expect(res.status).toBe(503);
    expect(res.headers["retry-after"]).toBe("30");
    expect(ChargeResponse.parse(res.body)).toMatchObject({
      status: "error",
      status_detail: "service_unavailable",
      id: null,
      transaction_amount: 15000,
      reference: KEY,
      card: {
        card_number: BODY.card_number,
        expiration_date: BODY.expiration_date,
        security_code: BODY.security_code,
        cardholder_name: BODY.cardholder_name,
      },
    });
    const found = await lookup(KEY);
    expect(found.status).toBe(503);
    expect(found.headers["retry-after"]).toBe("30");
    expect(ChargeResponse.parse(found.body).reference).toBe(KEY);
  });

  it("stores nothing during the Outage", async () => {
    const { post, lookup, outage } = await outageSetup();
    await outage({ active: true });
    expect((await post(BODY, KEY)).status).toBe(503);
    await outage({ active: false });
    expect((await lookup(KEY)).status).toBe(404);
    const res = await post(BODY, KEY);
    expect(res.status).toBe(201);
    expect(res.headers["idempotent-replayed"]).toBeUndefined();
  });

  it("answers 503 for a stored key during the Outage and replays it after", async () => {
    const { post, outage } = await outageSetup();
    const first = await post(BODY, KEY);
    expect(first.status).toBe(201);
    await outage({ active: true });
    expect((await post(BODY, KEY)).status).toBe(503);
    await outage({ active: false });
    const again = await post(BODY, KEY);
    expect(again.status).toBe(201);
    expect(again.headers["idempotent-replayed"]).toBe("true");
    expect(ChargeResponse.parse(again.body).id).toBe(
      ChargeResponse.parse(first.body).id,
    );
  });

  it("keeps format errors and the health check during the Outage", async () => {
    const { app, post, outage } = await outageSetup();
    await outage({ active: true });
    const res = await post({ ...BODY, security_code: "54" });
    expect(res.status).toBe(400);
    expect(ChargeResponse.parse(res.body).status_detail).toBe(
      "invalid_request",
    );
    const health = await request(app).get("/api/health");
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ status: "ok" });
  });

  it("limits each IP to 60 lookups a minute", async () => {
    const { lookup } = await outageSetup();
    for (let i = 0; i < 60; i++)
      expect((await lookup(UNKNOWN)).status).toBe(404);
    const res = await lookup(UNKNOWN);
    expect(res.status).toBe(429);
    expect(ChargeResponse.parse(res.body)).toMatchObject({
      status: "error",
      status_detail: "rate_limited",
      reference: UNKNOWN,
    });
    expect(String(res.headers["retry-after"])).toMatch(/^[1-9]\d*$/);
  });

  it("answers an unexpected lookup error with 500 in the Charge shape", async () => {
    const { lookup, chargeStore } = await outageSetup();
    vi.spyOn(chargeStore, "get").mockImplementation(() => {
      throw new Error("boom");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await lookup(KEY);
    expect(res.status).toBe(500);
    expect(ChargeResponse.parse(res.body).status_detail).toBe("internal_error");
    expect(ChargeResponse.parse(res.body).reference).toBe(KEY);
    expect(res.text).not.toContain("boom");
  });
});
