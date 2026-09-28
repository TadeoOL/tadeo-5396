export class UnreadableDataError extends Error {
  readonly key: string;

  constructor(key: string) {
    super(`Unreadable local data in ${key}`);
    this.name = "UnreadableDataError";
    this.key = key;
  }
}
