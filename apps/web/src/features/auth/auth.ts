import { startSession } from "@/storage/session";
import { addUser } from "@/storage/users";
import { createCredential } from "./credential";
import type { SignUpValues } from "./schemas";

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
