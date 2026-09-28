import type { AppDeps } from "./app.ts";
import { createChargeStore } from "./snailpay/charge-store.ts";

export function createTestDeps(overrides: Partial<AppDeps> = {}): AppDeps {
  return {
    serveWeb: false,
    chargeStore: createChargeStore(),
    sleep: () => Promise.resolve(),
    ...overrides,
  };
}
