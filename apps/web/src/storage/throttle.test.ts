import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { getBackend, setBackend } from "./backend";
import { createMemoryStorage } from "./memory-storage";
import {
  clearThrottle,
  getLock,
  recordFailure,
  THROTTLE_KEY,
} from "./throttle";

beforeEach(() => {
  setBackend(createMemoryStorage());
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-28T12:00:00.000Z"));
});
afterEach(() => vi.useRealTimers());

function fail5(email = "ana@example.com"): string | null {
  for (let i = 0; i < 4; i++) expect(recordFailure(email)).toBeNull();
  return recordFailure(email);
}

test("locks an email for 30 s after 5 consecutive failures", () => {
  const lockedUntil = fail5();
  expect(lockedUntil).toBe("2026-09-28T12:00:30.000Z");
  vi.setSystemTime(new Date("2026-09-28T12:00:29.999Z"));
  expect(getLock("ana@example.com")).toBe(lockedUntil);
  vi.setSystemTime(new Date("2026-09-28T12:00:30.000Z"));
  expect(getLock("ana@example.com")).toBeNull();
});

test("doubles each later lock up to 15 min", () => {
  const lengths: number[] = [];
  for (let i = 0; i < 7; i++) {
    const start = Date.now();
    const lockedUntil = fail5()!;
    lengths.push((Date.parse(lockedUntil) - start) / 1000);
    vi.setSystemTime(new Date(lockedUntil));
  }
  expect(lengths).toEqual([30, 60, 120, 240, 480, 900, 900]);
});

test("keys the throttle by email", () => {
  fail5();
  expect(getLock("bob@example.com")).toBeNull();
});

test("discards an invalid throttle value silently", () => {
  getBackend().setItem(THROTTLE_KEY, "not json");
  expect(getLock("ana@example.com")).toBeNull();
  expect(recordFailure("ana@example.com")).toBeNull();
  expect(JSON.parse(getBackend().getItem(THROTTLE_KEY)!)).toEqual({
    "ana@example.com": { failures: 1, lockCount: 0 },
  });
});

test("clearThrottle removes the entry", () => {
  recordFailure("ana@example.com");
  recordFailure("bob@example.com");
  clearThrottle("ana@example.com");
  expect(JSON.parse(getBackend().getItem(THROTTLE_KEY)!)).toEqual({
    "bob@example.com": { failures: 1, lockCount: 0 },
  });
});
