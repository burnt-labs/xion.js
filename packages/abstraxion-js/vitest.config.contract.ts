import { defineConfig } from "vitest/config";
import path from "path";

// Vitest config for the SDK ↔ dashboard contract test only.
// Kept separate from vitest.config.integration.ts so CI can run this with
// different pass/fail semantics (testnet hard-fail, mainnet informational)
// without going through the broader integration suite's failure cap.
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
    include: ["tests/integration/message-contract.integration.test.ts"],
    exclude: ["node_modules", "dist"],
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
