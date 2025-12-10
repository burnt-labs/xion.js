import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: [
      "../test-utils/src/vitest/setup.ts", // Shared webauthn and global mocks
      "./vitest.setup.ts", // Package-specific setup
    ],
    // Explicitly include tests in __tests__ directories and integration tests
    include: [
      "**/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      "**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      "tests/integration/**/*.integration.test.{ts,tsx}",
    ],
    exclude: ["node_modules", "dist", ".next", ".turbo"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/**", "dist/**", "**/*.test.ts", "**/*.config.ts"],
    },
  },
});
