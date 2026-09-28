import { describe, expect, it } from "vitest";
import { localIsoDate } from "./date.ts";

describe("localIsoDate", () => {
  it("formats the local calendar date, not the UTC one", () => {
    expect(localIsoDate(new Date(2026, 8, 28, 23, 59, 59))).toBe("2026-09-28");
    expect(localIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
