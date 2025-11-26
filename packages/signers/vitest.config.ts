import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "**/*.test.ts",
        "**/*.config.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@github/webauthn-json/browser-ponyfill": path.resolve(
        __dirname,
        "__mocks__/@github/webauthn-json/browser-ponyfill.ts",
      ),
    },
  },
});
