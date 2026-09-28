import { ChargeRequest, Uuid } from "@snailrace/contracts";
import express, {
  type ErrorRequestHandler,
  type Request,
  type RequestHandler,
  type Response,
  Router,
} from "express";
import { rateLimit } from "express-rate-limit";
import type { ChargeStore } from "./charge-store.ts";
import {
  type ChargeReply,
  createCharge,
  echoCharge,
  type Sleep,
} from "./charges.ts";

function referenceOf(req: Request): unknown {
  return req.get("X-Idempotency-Key");
}

function send(res: Response, reply: ChargeReply): void {
  if (reply.replayed) res.set("Idempotent-Replayed", "true");
  res.status(reply.status).json(reply.body);
}

function limitPerMinute(limit: number): RequestHandler {
  return rateLimit({
    windowMs: 60_000,
    limit,
    handler: (req, res) => {
      res
        .status(429)
        .json(echoCharge("rate_limited", referenceOf(req), req.body));
    },
  });
}

const chargeErrorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const status = (err as { status?: unknown } | null)?.status;
  if (typeof status === "number" && status >= 400 && status <= 499) {
    res
      .status(400)
      .json(
        echoCharge("invalid_request", referenceOf(req), undefined, [
          { field: "body", message: "The request body could not be read." },
        ]),
      );
    return;
  }
  console.error(err);
  res
    .status(500)
    .json(echoCharge("internal_error", referenceOf(req), req.body));
};

export function createSnailPayRouter(deps: {
  chargeStore: ChargeStore;
  sleep: Sleep;
}): Router {
  const router = Router();
  const json = express.json({ limit: "10kb" });

  const postCharge: RequestHandler = async (req, res) => {
    const key = Uuid.safeParse(req.get("X-Idempotency-Key"));
    const body = ChargeRequest.safeParse(req.body);
    if (!key.success || !body.success) {
      const errors = [
        ...(key.success
          ? []
          : [{ field: "X-Idempotency-Key", message: "Must be a UUID." }]),
        ...(body.success
          ? []
          : body.error.issues.map((issue) => ({
              field: issue.path.join(".") || "body",
              message: issue.message,
            }))),
      ];
      res
        .status(400)
        .json(
          echoCharge(
            "invalid_request",
            req.get("X-Idempotency-Key"),
            req.body,
            errors,
          ),
        );
      return;
    }
    send(
      res,
      await createCharge({
        store: deps.chargeStore,
        key: key.data,
        request: body.data,
        sleep: deps.sleep,
      }),
    );
  };

  router.post(
    "/charges",
    json,
    limitPerMinute(10),
    postCharge,
    chargeErrorHandler,
  );
  return router;
}
