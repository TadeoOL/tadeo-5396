import path from "node:path";
import type { HealthResponse } from "@snailrace/contracts";
import express from "express";
import helmet from "helmet";
import { errorHandler, sendError } from "./http/errors.ts";
import { requestId } from "./http/request-id.ts";
import { requestLog } from "./http/request-log.ts";
import { raceDaysRouter } from "./race-days/routes.ts";
import type { ChargeStore } from "./snailpay/charge-store.ts";
import type { Sleep } from "./snailpay/charges.ts";
import { createSnailPayRouter } from "./snailpay/routes.ts";

export type AppDeps = {
  serveWeb: boolean;
  chargeStore: ChargeStore;
  sleep: Sleep;
};

const webDist = path.join(import.meta.dirname, "../../web/dist");

export function createApp(deps: AppDeps): express.Express {
  const app = express();
  // Assumed until measured on the first Render deploy (docs/deployment.md#proxy-hop-count).
  app.set("trust proxy", 1);
  app.use(requestId, requestLog, helmet());
  // Before the global JSON parser: SnailPay parses its own bodies, so its errors answer in the Charge shape.
  app.use("/api/snailpay", createSnailPayRouter(deps));
  app.use(express.json({ limit: "10kb" }));

  app.get("/api/health", (_req, res) => {
    const body: HealthResponse = { status: "ok" };
    res.json(body);
  });
  app.use("/api/race-days", raceDaysRouter);

  if (deps.serveWeb) {
    app.use("/api", (_req, res) => {
      sendError(res, 404, "not_found", "No API route matches this path.");
    });
    app.use(express.static(webDist));
    app.get("/{*splat}", (_req, res) => {
      res.sendFile(path.join(webDist, "index.html"));
    });
  }

  app.use(errorHandler);
  return app;
}
