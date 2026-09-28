import { z } from "zod";
import { getBackend } from "./backend";
import { notify } from "./subscribe";

export const THROTTLE_KEY = "snailrace.v1.throttle";

const ThrottleSchema = z.record(
  z.string(),
  z.object({
    failures: z.int().nonnegative(),
    lockCount: z.int().nonnegative(),
    lockedUntil: z.iso.datetime().optional(),
  }),
);

type Throttle = z.infer<typeof ThrottleSchema>;

function read(): Throttle {
  try {
    return ThrottleSchema.parse(
      JSON.parse(getBackend().getItem(THROTTLE_KEY) ?? "{}"),
    );
  } catch {
    return {};
  }
}

function write(throttle: Throttle): void {
  getBackend().setItem(THROTTLE_KEY, JSON.stringify(throttle));
  notify();
}

export function getLock(email: string): string | null {
  const lockedUntil = read()[email]?.lockedUntil;
  return lockedUntil && Date.parse(lockedUntil) > Date.now()
    ? lockedUntil
    : null;
}

export function recordFailure(email: string): string | null {
  const throttle = read();
  const entry = throttle[email] ?? { failures: 0, lockCount: 0 };
  if (entry.failures + 1 < 5) {
    write({ ...throttle, [email]: { ...entry, failures: entry.failures + 1 } });
    return null;
  }
  const lockCount = entry.lockCount + 1;
  const lockedUntil = new Date(
    Date.now() + Math.min(30_000 * 2 ** (lockCount - 1), 900_000),
  ).toISOString();
  write({ ...throttle, [email]: { failures: 0, lockCount, lockedUntil } });
  return lockedUntil;
}

export function clearThrottle(email: string): void {
  const throttle = read();
  if (!(email in throttle)) return;
  const next = { ...throttle };
  delete next[email];
  write(next);
}
