import { getBackend } from "./backend.ts";
import { notify } from "./subscribe.ts";

export function resetLocalData(): void {
  const storage = getBackend();
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith("snailrace.v1.")) keys.push(key);
  }
  for (const key of keys) storage.removeItem(key);
  notify();
}
