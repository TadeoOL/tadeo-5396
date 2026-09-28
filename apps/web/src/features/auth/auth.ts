import { startSession } from "@/storage/session";
import { clearThrottle, getLock, recordFailure } from "@/storage/throttle";
import { addUser, findUserByEmail } from "@/storage/users";
import { createCredential, verifyCredential } from "./credential";
import type { SignInValues, SignUpValues } from "./schemas";

export async function signUp(
  values: SignUpValues,
): Promise<"signed-up" | "duplicate-email"> {
  const credential = await createCredential(values.password);
  const user = addUser({
    fullName: values.fullName,
    email: values.email,
    credential,
  });
  if (!user) return "duplicate-email";
  startSession(user.id);
  return "signed-up";
}

export type SignInResult =
  | { status: "signed-in" }
  | { status: "invalid" }
  | { status: "locked"; lockedUntil: string };

export async function signIn(values: SignInValues): Promise<SignInResult> {
  const lock = getLock(values.email);
  if (lock) return { status: "locked", lockedUntil: lock };
  const user = findUserByEmail(values.email);
  if (!user || !(await verifyCredential(values.password, user.credential))) {
    const lockedUntil = recordFailure(values.email);
    return lockedUntil
      ? { status: "locked", lockedUntil }
      : { status: "invalid" };
  }
  clearThrottle(values.email);
  startSession(user.id);
  return { status: "signed-in" };
}
