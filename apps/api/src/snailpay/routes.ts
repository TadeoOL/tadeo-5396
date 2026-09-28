import { ChargeRequest, OutageState, Uuid } from "@snailrace/contracts";
import express, {
  type ErrorRequestHandler,
  type Request,
  type RequestHandler,
  type Response,
  Router,
} from "express";
import { rateLimit } from "express-rate-limit";
import { sendError } from "../http/errors.ts";
import type { ChargeStore } from "./charge-store.ts";
import {
  type ChargeReply,
  createCharge,
  echoCharge,
  lookUpCharge,
  type Sleep,
} from "./charges.ts";

function referenceOf(req: Request): unknown {
  return req.method === "POST"
    ? req.get("X-Idempotency-Key")
    : req.query.reference;
}

function send(res: Response, reply: ChargeReply): void {
  if (reply.replayed) res.set("Idempotent-Replayed", "true");
  if (reply.status === 503) res.set("Retry-After", "30");
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
  let outageActive = false;

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
        outageActive,
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

  const getCharge: RequestHandler = (req, res) => {
    const reference = Uuid.safeParse(req.query.reference);
    if (!reference.success) {
      res
        .status(400)
        .json(
          echoCharge("invalid_request", req.query.reference, undefined, [
            { field: "reference", message: "Must be a UUID." },
          ]),
        );
      return;
    }
    send(
      res,
      lookUpCharge({
        store: deps.chargeStore,
        reference: reference.data,
        outageActive,
      }),
    );
  };

  router.get("/charges", limitPerMinute(60), getCharge, chargeErrorHandler);
  router.get("/outage", (_req, res) => {
    res.json({ active: outageActive } satisfies OutageState);
  });
  router.put("/outage", json, (req, res) => {
    const body = OutageState.safeParse(req.body);
    if (!body.success) {
      sendError(
        res,
        400,
        "invalid_request",
        'Send {"active": true} or {"active": false}.',
      );
      return;
    }
    outageActive = body.data.active;
    res.json(body.data);
  });
  return router;
}
