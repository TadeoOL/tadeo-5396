import { expect, test } from "vitest";
import { formatMxn } from "./format";

test("formats cents as MXN", () => {
  expect(formatMxn(0)).toBe("$0.00");
  expect(formatMxn(15000)).toBe("$150.00");
  expect(formatMxn(125000)).toBe("$1,250.00");
});
