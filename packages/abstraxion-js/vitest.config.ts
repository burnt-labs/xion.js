import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Default Vitest configuration for abstraxion-js package.
 * Runs unit tests in src/ once the framework-agnostic controller tests move here.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: [
      "../test-utils/src/vitest/setup.ts", // Shared webauthn and global mocks
    ],
    // Include only unit tests in src/ directory
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
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
    // Commit 1 scaffolds the package before tests move here.
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
