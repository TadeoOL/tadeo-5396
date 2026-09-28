import { describe, expect, it } from "vitest";
import { readConfig } from "./config.ts";

describe("readConfig", () => {
  it("defaults PORT to 3000 and NODE_ENV to development", () => {
    expect(readConfig({})).toEqual({ port: 3000, nodeEnv: "development" });
    expect(readConfig({ PORT: "10000", NODE_ENV: "production" })).toEqual({
      port: 10000,
      nodeEnv: "production",
    });
  });

  it("rejects an invalid PORT or NODE_ENV", () => {
    expect(() => readConfig({ PORT: "abc" })).toThrow(/PORT/);
    expect(() => readConfig({ PORT: "0" })).toThrow(/PORT/);
    expect(() => readConfig({ NODE_ENV: "staging" })).toThrow(/NODE_ENV/);
  });
});
