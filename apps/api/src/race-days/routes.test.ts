import {
  BetsResponse,
  ErrorEnvelope,
  RaceDayResponse,
} from "@snailrace/contracts";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../app.ts";
import { createTestDeps } from "../test-deps.ts";
import { generateBets, generateRaceDay } from "./generator.ts";

vi.mock("./generator.ts", { spy: true });

const USER = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const OTHER = "0b7e2f0e-6a1d-4f7b-9d43-2a1c5e9f8b10";
const app = () => createApp(createTestDeps());

describe("race-day routes", () => {
  it("serves the Race Day for a date", async () => {
    const res = await request(app()).get("/api/race-days/2026-09-28");
    expect(res.status).toBe(200);
    expect(res.get("Content-Type")).toMatch(/application\/json/);
    expect(RaceDayResponse.parse(res.body)).toEqual(
      generateRaceDay("2026-09-28"),
    );
  });

  it("serves a User's Bets for a date", async () => {
    const res = await request(app()).get(
      `/api/race-days/2026-09-28/bets?userId=${USER}`,
    );
    expect(res.status).toBe(200);
    expect(BetsResponse.parse(res.body)).toEqual(
      generateBets("2026-09-28", USER),
    );
  });

  it("accepts a leap day and future dates", async () => {
    for (const date of ["2028-02-29", "2099-12-31"]) {
      expect((await request(app()).get(`/api/race-days/${date}`)).status).toBe(
        200,
      );
      expect(
        (await request(app()).get(`/api/race-days/${date}/bets?userId=${USER}`))
          .status,
      ).toBe(200);
    }
  });

  it("rejects a malformed or impossible date with 400 in the error envelope", async () => {
    for (const date of [
      "2026-9-28",
      "28-09-2026",
      "2026-02-30",
      "2026-13-01",
      "today",
    ]) {
      for (const path of [
        `/api/race-days/${date}`,
        `/api/race-days/${date}/bets?userId=${USER}`,
      ]) {
        const res = await request(app()).get(path);
        expect(res.status).toBe(400);
        expect(ErrorEnvelope.parse(res.body)).toEqual({
          error: {
            code: "invalid_request",
            message:
              "The date must be a real calendar date in YYYY-MM-DD format.",
            requestId: res.get("X-Request-Id"),
          },
        });
        expect(res.get("Cache-Control")).toBeUndefined();
      }
    }
  });

  it("rejects a missing or non-UUID userId with 400 in the error envelope", async () => {
    for (const query of [
      "",
      "?userId=abc",
      `?userId=${USER}&userId=${OTHER}`,
    ]) {
      const res = await request(app()).get(
        `/api/race-days/2026-09-28/bets${query}`,
      );
      expect(res.status).toBe(400);
      const { error } = ErrorEnvelope.parse(res.body);
      expect(error.code).toBe("invalid_request");
      expect(error.message).toBe("The userId query parameter must be a UUID.");
      expect(res.get("Cache-Control")).toBeUndefined();
    }
  });

  it("sets the cache headers and answers a matching If-None-Match with 304", async () => {
    for (const [path, cache] of [
      ["/api/race-days/2026-09-28", "public, max-age=86400"],
      [
        `/api/race-days/2026-09-28/bets?userId=${USER}`,
        "private, max-age=86400",
      ],
    ] as const) {
      const res = await request(app()).get(path);
      expect(res.get("Cache-Control")).toBe(cache);
      const etag = res.get("ETag");
      expect(etag).toMatch(/^W\/"/);
      const again = await request(app()).get(path).set("If-None-Match", etag!);
      expect(again.status).toBe(304);
    }
  });

  it("answers an unexpected error with 500 internal_error in the error envelope", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(generateRaceDay).mockImplementationOnce(() => {
      throw new Error("boom");
    });
    const res = await request(app())
      .get("/api/race-days/2026-09-28")
      .set("X-Request-Id", OTHER);
    expect(res.status).toBe(500);
    expect(ErrorEnvelope.parse(res.body)).toEqual({
      error: {
        code: "internal_error",
        message: "Something went wrong.",
        requestId: OTHER,
      },
    });
    expect(res.get("X-Request-Id")).toBe(OTHER);
    expect(res.text).not.toContain("boom");
    expect(log).toHaveBeenCalledTimes(1);
    log.mockRestore();
  });
});
