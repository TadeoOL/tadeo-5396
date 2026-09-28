import { ErrorEnvelope, Uuid } from "@snailrace/contracts";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.ts";

const app = createApp({ serveWeb: false });

describe("createApp", () => {
  it("answers the health check", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
    expect(res.headers["content-type"]).toMatch(/application\/json/);
  });

  it("echoes a UUID X-Request-Id", async () => {
    const id = "0b7e2f0e-6a1d-4f7b-9d43-2a1c5e9f8b10";
    const res = await request(app).get("/api/health").set("X-Request-Id", id);
    expect(res.headers["x-request-id"]).toBe(id);
  });

  it("replaces a missing or non-UUID X-Request-Id with a new UUID", async () => {
    const a = await request(app).get("/api/health");
    const b = await request(app)
      .get("/api/health")
      .set("X-Request-Id", "not-a-uuid");
    const idA = Uuid.parse(a.headers["x-request-id"]);
    const idB = Uuid.parse(b.headers["x-request-id"]);
    expect(idA).not.toBe(idB);
  });

  it("rejects a JSON body over 10 kb with 413 in the error envelope", async () => {
    const res = await request(app)
      .post("/api/health")
      .send({ a: "x".repeat(11 * 1024) });
    expect(res.status).toBe(413);
    expect(ErrorEnvelope.parse(res.body)).toEqual({
      error: {
        code: "invalid_request",
        message: "The request body could not be read.",
        requestId: res.headers["x-request-id"],
      },
    });
  });

  it("rejects malformed JSON with 400 in the error envelope", async () => {
    const res = await request(app)
      .post("/api/health")
      .set("Content-Type", "application/json")
      .send("{");
    expect(res.status).toBe(400);
    expect(ErrorEnvelope.parse(res.body).error.code).toBe("invalid_request");
  });

  it("answers an unknown /api path with 404 in the error envelope when serving the web app", async () => {
    const res = await request(createApp({ serveWeb: true })).get("/api/nope");
    expect(res.status).toBe(404);
    expect(ErrorEnvelope.parse(res.body)).toEqual({
      error: {
        code: "not_found",
        message: "No API route matches this path.",
        requestId: res.headers["x-request-id"],
      },
    });
  });
});
