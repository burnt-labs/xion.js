import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Default Vitest configuration for abstraxion package
 * Runs both unit tests (if any) and integration tests
 * 
 * Integration tests are in tests/integration/ directory
 * React integration tests are in tests/integration/react/ directory
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node", // Default to node, react tests use jsdom via separate config
    setupFiles: [
      "../test-utils/src/vitest/setup.ts", // Shared webauthn and global mocks
      "./vitest.setup.integration.ts", // Package-specific setup
    ],
    // Include both unit tests (if any) and integration tests
    include: [
      "**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      "tests/integration/**/*.integration.test.{ts,tsx}",
    ],
    exclude: [
      "node_modules",
      "dist",
      ".next",
      ".turbo",
      // Exclude react integration tests - they use separate config
      "tests/integration/react/**/*.integration.test.tsx",
    ],
    testTimeout: 120000, // 2 minutes for integration tests
    hookTimeout: 120000,
    teardownTimeout: 30000,
    coverage: {
      enabled: false, // Disable coverage for integration tests by default
    },
    // Retry failed tests once (network flakiness)
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

