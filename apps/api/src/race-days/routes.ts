import { IsoDate, Uuid } from "@snailrace/contracts";
import { Router } from "express";
import { sendError } from "../http/errors.ts";
import { generateBets, generateRaceDay } from "./generator.ts";

export const raceDaysRouter: Router = Router();

const BAD_DATE = "The date must be a real calendar date in YYYY-MM-DD format.";

raceDaysRouter.get("/:date", (req, res) => {
  const date = IsoDate.safeParse(req.params.date);
  if (!date.success) {
    sendError(res, 400, "invalid_request", BAD_DATE);
    return;
  }
  res.set("Cache-Control", "public, max-age=86400");
  res.json(generateRaceDay(date.data));
});

raceDaysRouter.get("/:date/bets", (req, res) => {
  const date = IsoDate.safeParse(req.params.date);
  if (!date.success) {
    sendError(res, 400, "invalid_request", BAD_DATE);
    return;
  }
  const userId = Uuid.safeParse(req.query.userId);
  if (!userId.success) {
    sendError(
      res,
      400,
      "invalid_request",
      "The userId query parameter must be a UUID.",
    );
    return;
  }
  res.set("Cache-Control", "private, max-age=86400");
  res.json(generateBets(date.data, userId.data));
});
