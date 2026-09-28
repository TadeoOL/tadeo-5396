import { BetsResponse, RaceDayResponse } from "@snailrace/contracts";
import { queryOptions } from "@tanstack/react-query";
import type { z } from "zod";
import { request } from "./http.ts";

async function fetchOk<T>(
  path: string,
  schema: z.ZodType<T>,
  signal: AbortSignal,
): Promise<T> {
  const result = await request(path, schema, { timeoutMs: 10_000, signal });
  if (result.kind !== "response" || result.status !== 200)
    throw new Error(`Request to ${path} failed: ${result.kind}`);
  return result.body;
}

export const raceDayQuery = (date: string) =>
  queryOptions({
    queryKey: ["race-day", date],
    queryFn: ({ signal }) =>
      fetchOk(`/api/race-days/${date}`, RaceDayResponse, signal),
    staleTime: Infinity,
    retry: 2,
  });

export const betsQuery = (date: string, userId: string) =>
  queryOptions({
    queryKey: ["bets", date, userId],
    queryFn: ({ signal }) =>
      fetchOk(
        `/api/race-days/${date}/bets?userId=${encodeURIComponent(userId)}`,
        BetsResponse,
        signal,
      ),
    staleTime: Infinity,
    retry: 2,
  });
