import { ErrorEnvelope } from "@snailrace/contracts";
import express from "express";
import request from "supertest";
import { expect, it, vi } from "vitest";
import { errorHandler } from "./errors.ts";
import { requestId } from "./request-id.ts";

it("answers an unexpected error with 500 internal_error and never returns the stack", async () => {
  const boom = new Error("boom");
  const app = express();
  app.use(requestId);
  app.get("/boom", () => {
    throw boom;
  });
  app.use(errorHandler);
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});

  const res = await request(app).get("/boom");

  expect(res.status).toBe(500);
  expect(ErrorEnvelope.parse(res.body)).toEqual({
    error: {
      code: "internal_error",
      message: "Something went wrong.",
      requestId: res.headers["x-request-id"],
    },
  });
  expect(res.text).not.toContain("boom");
  expect(spy).toHaveBeenCalledTimes(1);
  expect(spy).toHaveBeenCalledWith(boom);
  spy.mockRestore();
});
