import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Vitest configuration for integration tests
 * Uses longer timeouts and different environment settings
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node", // Node environment for integration tests
    testTimeout: 120000, // 2 minutes for network operations
    hookTimeout: 120000,
    teardownTimeout: 30000,
    include: ["tests/integration/**/*.integration.test.ts"],
    exclude: ["node_modules", "dist", "src/**/*.test.ts"],
    coverage: {
      enabled: false, // Disable coverage for integration tests
    },
    // Retry failed tests once
    retry: 1,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

