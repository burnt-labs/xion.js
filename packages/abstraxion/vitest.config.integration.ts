import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Vitest configuration for integration tests
 * Uses longer timeouts and different environment settings
 *
 * Uses the shared webauthn mock from @burnt-labs/test-utils/vitest/setup
 * This eliminates the need for package-specific mocks and aliases
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node", // Node environment for integration tests
    setupFiles: [
      "../test-utils/src/vitest/setup.ts", // Shared webauthn and global mocks
      "./vitest.setup.integration.ts", // Package-specific setup
    ],
    testTimeout: 120000, // 2 minutes for network operations
    hookTimeout: 120000,
    teardownTimeout: 30000,
    include: [
      "tests/integration/**/*.integration.test.ts",
      "tests/integration/**/*.diagnostic.test.ts",
      "tests/integration/**/*.test.ts",
    ],
    exclude: ["node_modules", "dist", "src/**/*.test.ts"],
    coverage: {
      enabled: false, // Disable coverage for integration tests
    },
    // Retry failed tests once
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

