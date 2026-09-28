import { beforeEach, expect, test, vi } from "vitest";
import { setBackend } from "./backend";
import { createMemoryStorage } from "./memory-storage";
import { notify, subscribe } from "./subscribe";

beforeEach(() => setBackend(createMemoryStorage()));

test("calls listeners on notify until they unsubscribe", () => {
  const listener = vi.fn();
  const unsubscribe = subscribe(listener);
  notify();
  expect(listener).toHaveBeenCalledTimes(1);
  unsubscribe();
  notify();
  expect(listener).toHaveBeenCalledTimes(1);
});

test("calls listeners for storage events with the snailrace.v1. prefix or a null key only", () => {
  const listener = vi.fn();
  const unsubscribe = subscribe(listener);
  for (const key of [
    "snailrace.v1.session",
    "snailrace.v1.ledger.9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
    null,
    "other.app",
  ]) {
    window.dispatchEvent(new StorageEvent("storage", { key }));
  }
  expect(listener).toHaveBeenCalledTimes(3);
  unsubscribe();
});
