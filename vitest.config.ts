import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    globals: false,
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/backend/jobs/analytics/math.ts",
        "src/backend/jobs/analytics/signals.ts",
        "src/backend/jobs/alerts/evaluator.ts",
        "src/backend/utils/cookies.util.ts",
        "src/backend/utils/hash.util.ts",
        "src/backend/utils/rate-limit.util.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // The real `server-only` package throws unconditionally when imported outside
      // the Next.js bundler, breaking unit tests that touch any backend util.
      "server-only": path.resolve(__dirname, "tests/server-only-stub.ts"),
    },
  },
});
