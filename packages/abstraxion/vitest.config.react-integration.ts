import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Vitest configuration for React integration tests
 * Uses jsdom environment for React Testing Library
 * Extends the base integration test config but with DOM support
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom", // DOM environment for React tests
    setupFiles: [
      "../test-utils/src/vitest/setup.ts", // Shared webauthn and global mocks
      "./vitest.setup.integration.ts", // Package-specific setup
      "./tests/integration/react/setup.tsx", // React-specific setup
    ],
    testTimeout: 120000, // 2 minutes for network operations
    hookTimeout: 120000,
    teardownTimeout: 30000,
    include: ["tests/integration/react/**/*.integration.test.tsx"],
    exclude: ["node_modules", "dist", "src/**/*.test.ts"],
    coverage: {
      enabled: false, // Disable coverage for integration tests
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
      "@": path.resolve(__dirname, "."),
    },
  },
});
