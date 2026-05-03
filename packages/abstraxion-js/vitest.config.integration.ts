import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Vitest configuration for integration tests in @burnt-labs/abstraxion-js.
 *
 * Migrated from packages/abstraxion-react in Phase 9f. These tests own the
 * runtime/controller/connector/orchestrator surface and are framework-agnostic.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: [
      "../test-utils/src/vitest/setup.ts",
      "./vitest.setup.integration.ts",
    ],
    testTimeout: 120000,
    hookTimeout: 120000,
    teardownTimeout: 30000,
    include: [
      "tests/integration/**/*.integration.test.ts",
      "tests/integration/**/*.diagnostic.test.ts",
      "tests/integration/**/*.test.ts",
    ],
    exclude: [
      "node_modules",
      "dist",
      "src/**/*.test.ts",
      // Run separately via `pnpm test:contract` so CI can apply different
      // pass/fail rules (testnet = hard-fail, mainnet = informational).
      "tests/integration/message-contract.integration.test.ts",
    ],
    coverage: { enabled: false },
    retry: 1,
    server: {
      deps: {
        inline: ["@github/webauthn-json"],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
