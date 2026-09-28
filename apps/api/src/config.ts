export type Config = { port: number; nodeEnv: "development" | "production" };

export function readConfig(env: Record<string, string | undefined>): Config {
  const rawPort = env.PORT ?? "3000";
  const port = Number(rawPort);
  if (!/^\d+$/.test(rawPort) || port < 1 || port > 65535) {
    throw new Error(
      `PORT must be an integer from 1 to 65535, got "${rawPort}"`,
    );
  }
  const nodeEnv = env.NODE_ENV ?? "development";
  if (nodeEnv !== "development" && nodeEnv !== "production") {
    throw new Error(
      `NODE_ENV must be "development" or "production", got "${nodeEnv}"`,
    );
  }
  return { port, nodeEnv };
}
