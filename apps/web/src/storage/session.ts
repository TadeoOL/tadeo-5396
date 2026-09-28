import { useEffect, useSyncExternalStore } from "react";
import { z } from "zod";
import { getBackend } from "./backend";
import { subscribe, notify } from "./subscribe";
import { readUsers, type User } from "./users";

export const SESSION_KEY = "snailrace.v1.session";
export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export type SessionState =
  | { status: "signed-in"; sessionId: string; user: User; expiresAt: string }
  | { status: "signed-out"; expired: boolean };

const SessionRecordSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  issuedAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
});

const SIGNED_OUT: SessionState = Object.freeze({
  status: "signed-out",
  expired: false,
});
const EXPIRED: SessionState = Object.freeze({
  status: "signed-out",
  expired: true,
});

let cache:
  | { raw: string; users: Readonly<Record<string, User>>; state: SessionState }
  | undefined;

function compute(
  raw: string,
  users: Readonly<Record<string, User>>,
): SessionState {
  let record: z.infer<typeof SessionRecordSchema>;
  try {
    record = SessionRecordSchema.parse(JSON.parse(raw));
  } catch {
    return SIGNED_OUT;
  }
  const user = users[record.userId];
  if (!user) return SIGNED_OUT;
  return Object.freeze({
    status: "signed-in",
    sessionId: record.id,
    user,
    expiresAt: record.expiresAt,
  });
}

/** Pure `useSyncExternalStore` snapshot: never writes, stable while nothing changed. */
export function readSession(): SessionState {
  const raw = getBackend().getItem(SESSION_KEY);
  if (raw === null) return SIGNED_OUT;
  const users = readUsers();
  if (cache?.raw !== raw || cache.users !== users) {
    cache = { raw, users, state: compute(raw, users) };
  }
  const { state } = cache;
  if (
    state.status === "signed-in" &&
    Date.parse(state.expiresAt) <= Date.now()
  ) {
    return EXPIRED;
  }
  return state;
}

export function startSession(userId: string): void {
  const issued = new Date();
  getBackend().setItem(
    SESSION_KEY,
    JSON.stringify({
      id: crypto.randomUUID(),
      userId,
      issuedAt: issued.toISOString(),
      expiresAt: new Date(issued.getTime() + SESSION_DURATION_MS).toISOString(),
    }),
  );
  notify();
}

export function endSession(): void {
  getBackend().removeItem(SESSION_KEY);
  notify();
}

export function useSession(): SessionState {
  const state = useSyncExternalStore(subscribe, readSession);
  useEffect(() => {
    if (state.status === "signed-out") {
      const backend = getBackend();
      if (
        readSession().status === "signed-out" &&
        backend.getItem(SESSION_KEY) !== null
      ) {
        backend.removeItem(SESSION_KEY);
      }
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      const left = Date.parse(state.expiresAt) - Date.now();
      if (left > 0) timer = setTimeout(arm, left);
      else notify();
    };
    arm();
    return () => clearTimeout(timer);
  }, [state]);
  return state;
}
