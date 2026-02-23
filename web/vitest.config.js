import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["__tests__/**/*.test.{js,ts}"],
    exclude: ["node_modules"],
    coverage: {
      reporter: ["text", "lcov"],
      include: ["libs/**", "app/api/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
