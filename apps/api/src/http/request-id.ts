import { randomUUID } from "node:crypto";
import { Uuid } from "@snailrace/contracts";
import type { RequestHandler, Response } from "express";

export const requestId: RequestHandler = (req, res, next) => {
  const incoming = Uuid.safeParse(req.get("X-Request-Id"));
  const id = incoming.success ? incoming.data : randomUUID();
  res.locals.requestId = id;
  res.set("X-Request-Id", id);
  next();
};

export function requestIdOf(res: Response): string {
  return res.locals.requestId as string;
}
