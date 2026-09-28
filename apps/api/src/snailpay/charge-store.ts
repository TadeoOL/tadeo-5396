import type { ChargeResponse } from "@snailrace/contracts";

export type StoredCharge = {
  requestHash: string;
  status: 201 | 402;
  body: ChargeResponse;
};
export type ChargeStore = Map<string, StoredCharge>;

// ponytail: uncapped and emptied by a restart (docs/specs/state-and-persistence.md#server-state).
export function createChargeStore(): ChargeStore {
  return new Map();
}
