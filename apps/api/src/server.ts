import { createApp } from "./app.ts";
import { readConfig } from "./config.ts";

const config = readConfig(process.env);

createApp({ serveWeb: config.nodeEnv === "production" }).listen(
  config.port,
  "0.0.0.0",
  () => {
    console.log(`API listening on port ${config.port}`);
  },
);
