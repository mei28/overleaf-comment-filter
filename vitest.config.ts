import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    env: { TZ: "UTC" },
    // Process CSS so `?inline` imports return the real stylesheet.
    css: true,
  },
});
