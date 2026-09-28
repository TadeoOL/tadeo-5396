import { createApp } from "./app.ts";
import { setTimeout as sleep } from "node:timers/promises";
import { readConfig } from "./config.ts";
import { createChargeStore } from "./snailpay/charge-store.ts";

const config = readConfig(process.env);

createApp({
  serveWeb: config.nodeEnv === "production",
  chargeStore: createChargeStore(),
  sleep,
}).listen(config.port, "0.0.0.0", () => {
  console.log(`API listening on port ${config.port}`);
});
