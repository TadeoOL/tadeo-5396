import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      { test: { name: "api", root: "./apps/api", environment: "node" } },
      {
        test: {
          name: "contracts",
          root: "./packages/contracts",
          environment: "node",
        },
      },
    ],
  },
});
