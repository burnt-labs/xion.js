import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Default Vitest configuration for abstraxion package
 * Runs ONLY unit tests (excludes integration tests)
 *
 * To run integration tests, use:
 * - pnpm test:integration (node-based integration tests)
 * - pnpm test:react (react-based integration tests)
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: [
      "../test-utils/src/vitest/setup.ts", // Shared webauthn and global mocks
    ],
    // Include only unit tests in src/ directory
    include: [
      "src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
    ],
    exclude: [
      "node_modules",
      "dist",
      ".next",
      ".turbo",
      // Exclude ALL integration tests - they use separate configs
      "tests/integration/**/*",
    ],
    testTimeout: 10000, // 10 seconds for unit tests
    hookTimeout: 10000,
    teardownTimeout: 5000,
    coverage: {
      enabled: false,
    },
    // Don't fail when no unit tests are found (all tests are integration tests)
    passWithNoTests: true,
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

