import type { RequestHandler } from "express";
import { requestIdOf } from "./request-id.ts";

export const requestLog: RequestHandler = (req, res, next) => {
  const start = performance.now();
  const { method, path } = req;
  res.on("finish", () => {
    console.log(
      JSON.stringify({
        requestId: requestIdOf(res),
        method,
        path,
        status: res.statusCode,
        durationMs: Math.round(performance.now() - start),
      }),
    );
  });
  next();
};
