import { OutageState } from "@snailrace/contracts";
import { queryOptions } from "@tanstack/react-query";
import { request } from "./http";

async function call(
  options: { method?: "PUT"; json?: unknown; signal?: AbortSignal } = {},
): Promise<OutageState> {
  const result = await request("/api/snailpay/outage", OutageState, {
    timeoutMs: 10_000,
    ...options,
  });
  if (result.kind !== "response" || result.status !== 200)
    throw new Error(`Outage call failed: ${result.kind}`);
  return result.body;
}

export const outageQuery = queryOptions({
  queryKey: ["outage"],
  queryFn: ({ signal }) => call({ signal }),
});

export const setOutage = (active: boolean): Promise<OutageState> =>
  call({ method: "PUT", json: { active } });
