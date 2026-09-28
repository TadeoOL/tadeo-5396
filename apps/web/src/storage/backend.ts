let override: Storage | undefined;

export function getBackend(): Storage {
  return override ?? window.localStorage;
}

export function setBackend(storage: Storage): void {
  override = storage;
}
