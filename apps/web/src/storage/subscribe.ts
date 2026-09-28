const listeners = new Set<() => void>();

function onStorage(event: StorageEvent): void {
  if (event.key === null || event.key.startsWith("snailrace.v1.")) notify();
}

export function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function notify(): void {
  for (const listener of [...listeners]) listener();
}
