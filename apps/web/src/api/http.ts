import type { z } from "zod";

export type ApiResult<T> =
  | { kind: "response"; status: number; headers: Headers; body: T }
  | { kind: "timeout" }
  | { kind: "aborted" }
  | { kind: "network-error" }
  | { kind: "unparseable"; status: number };

export async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  options: {
    method?: "GET" | "POST" | "PUT";
    headers?: Record<string, string>;
    json?: unknown;
    timeoutMs: number;
    signal?: AbortSignal;
  },
): Promise<ApiResult<T>> {
  const timeout = AbortSignal.timeout(options.timeoutMs);
  const signal = options.signal
    ? AbortSignal.any([timeout, options.signal])
    : timeout;
  const hasJson = options.json !== undefined;
  const headers = {
    ...(hasJson && { "Content-Type": "application/json" }),
    ...options.headers,
  };
  let res: Response;
  let text: string;
  try {
    res = await fetch(path, {
      method: options.method ?? "GET",
      headers,
      body: hasJson ? JSON.stringify(options.json) : undefined,
      signal,
    });
    text = await res.text();
  } catch (error) {
    const name = (error as { name?: unknown } | null)?.name;
    if (name === "TimeoutError") return { kind: "timeout" };
    if (name === "AbortError") return { kind: "aborted" };
    return { kind: "network-error" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { kind: "unparseable", status: res.status };
  }
  const result = schema.safeParse(parsed);
  if (!result.success) return { kind: "unparseable", status: res.status };
  return {
    kind: "response",
    status: res.status,
    headers: res.headers,
    body: result.data,
  };
}
