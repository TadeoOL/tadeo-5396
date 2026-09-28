import type { ErrorEnvelope } from "@snailrace/contracts";
import type { ErrorRequestHandler, Response } from "express";
import { requestIdOf } from "./request-id.ts";

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
): void {
  const body: ErrorEnvelope = {
    error: { code, message, requestId: requestIdOf(res) },
  };
  res.status(status).json(body);
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = (err as { status?: unknown }).status;
  // Body parser errors carry the raw body in err.body, so they are never logged.
  if (typeof status === "number" && status >= 400 && status <= 499) {
    sendError(
      res,
      status,
      "invalid_request",
      "The request body could not be read.",
    );
    return;
  }
  console.error(err);
  sendError(res, 500, "internal_error", "Something went wrong.");
};
