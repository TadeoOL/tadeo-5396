import type { ChargeResponse } from "@snailrace/contracts";
import { ChargeResponse as ChargeSchema } from "@snailrace/contracts";
import { afterEach, expect, test, vi } from "vitest";
import { z } from "zod";
import { request } from "./http";

const charge: ChargeResponse = {
  id: "0b7e2f0e-6a1d-4f7b-9d43-2a1c5e9f8b10",
  status: "rejected",
  status_detail: "cc_rejected_insufficient_amount",
  transaction_amount: 15000,
  date_created: "2026-09-28T12:00:00.000Z",
  authorization_code: null,
  reference: "5f1c3a8e-2d4b-4c6e-8f9a-1b2c3d4e5f60",
  payer_id: "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
  payer_email: "ana@example.com",
  card: {
    card_number: "************0002",
    expiration_date: "12/26",
    security_code: "***",
    cardholder_name: "Ana López",
  },
};

function stubFetch(impl: () => Promise<Response>) {
  const fetch = vi.fn((_input: string, _init: RequestInit) => impl());
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

const options = { timeoutMs: 10_000 };

afterEach(() => vi.unstubAllGlobals());

test("returns a parsed response with its status", async () => {
  stubFetch(() => Promise.resolve(Response.json(charge, { status: 402 })));
  expect(await request("/x", ChargeSchema, options)).toMatchObject({
    kind: "response",
    status: 402,
    body: charge,
  });
});

test("classifies a TimeoutError as a timeout", async () => {
  stubFetch(() =>
    Promise.reject(
      new DOMException("The operation timed out.", "TimeoutError"),
    ),
  );
  expect(await request("/x", ChargeSchema, options)).toEqual({
    kind: "timeout",
  });
});

test("classifies an AbortError as an abort", async () => {
  stubFetch(() => Promise.reject(new DOMException("aborted", "AbortError")));
  expect(await request("/x", ChargeSchema, options)).toEqual({
    kind: "aborted",
  });
});

test("classifies a failed fetch as a network error", async () => {
  stubFetch(() => Promise.reject(new TypeError("Failed to fetch")));
  expect(await request("/x", ChargeSchema, options)).toEqual({
    kind: "network-error",
  });
});

test("classifies a body that fails its schema as unparseable", async () => {
  stubFetch(() =>
    Promise.resolve(new Response("<html>Bad gateway</html>", { status: 502 })),
  );
  expect(await request("/x", ChargeSchema, options)).toEqual({
    kind: "unparseable",
    status: 502,
  });
  stubFetch(() => Promise.resolve(Response.json({}, { status: 200 })));
  expect(await request("/x", ChargeSchema, options)).toEqual({
    kind: "unparseable",
    status: 200,
  });
});

test("passes an AbortSignal to fetch and honors the caller's", async () => {
  const fetch = stubFetch(() => Promise.resolve(Response.json({})));
  await request("/x", z.object({}), options);
  expect(fetch.mock.calls[0]?.[1].signal).toBeInstanceOf(AbortSignal);
  const controller = new AbortController();
  await request("/x", z.object({}), { ...options, signal: controller.signal });
  const signal = fetch.mock.calls[1]?.[1].signal;
  expect(signal).toBeInstanceOf(AbortSignal);
  expect(signal?.aborted).toBe(false);
  controller.abort();
  expect(signal?.aborted).toBe(true);
});

test("sends JSON with its content type", async () => {
  const fetch = stubFetch(() => Promise.resolve(Response.json({})));
  await request("/x", z.object({}), {
    method: "POST",
    headers: { "X-Idempotency-Key": "k" },
    json: { a: 1 },
    timeoutMs: 10_000,
  });
  expect(fetch).toHaveBeenCalledWith(
    "/x",
    expect.objectContaining({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Idempotency-Key": "k",
      },
      body: '{"a":1}',
    }),
  );
});
