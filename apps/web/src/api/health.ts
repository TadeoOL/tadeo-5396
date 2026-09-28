import { HealthResponse } from "@snailrace/contracts";
import { queryOptions } from "@tanstack/react-query";
import { request } from "./http";

export const healthQuery = queryOptions({
  queryKey: ["health"],
  queryFn: async ({ signal }) => {
    const result = await request("/api/health", HealthResponse, {
      timeoutMs: 90_000,
      signal,
    });
    if (result.kind !== "response" || result.status !== 200)
      throw new Error(`Health check failed: ${result.kind}`);
    return result.body;
  },
  staleTime: 5 * 60_000,
  retry: 2,
});
