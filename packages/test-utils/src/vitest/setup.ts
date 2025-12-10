/**
 * Shared Vitest setup for all xion.js packages
 *
 * This file provides global mocks and configuration that should be applied
 * to all test suites across the monorepo.
 *
 * Usage in package vitest.config.ts:
 * ```typescript
 * import { defineConfig } from 'vitest/config';
 *
 * export default defineConfig({
 *   test: {
 *     setupFiles: ['@burnt-labs/test-utils/vitest/setup'],
 *     // ... other config
 *   }
 * });
 * ```
 */

import { vi } from "vitest";

/**
 * Mock @github/webauthn-json/browser-ponyfill globally
 *
 * This is required because:
 * 1. The package is browser-only and doesn't work in Node.js test environments
 * 2. It's imported by @burnt-labs/signers for passkey authentication
 * 3. Without this mock, any test that imports from signers will fail with module resolution errors
 *
 * The mock provides all the necessary functions with sensible test defaults:
 * - create/get return undefined (passkey operations)
 * - supported returns false (no WebAuthn support in Node.js)
 * - parse functions return their input (no-op parsers)
 */
vi.mock("@github/webauthn-json/browser-ponyfill", () => ({
  create: vi.fn(),
  get: vi.fn(),
  supported: vi.fn(() => false),
  parseCreationOptionsFromJSON: vi.fn((input) => input),
  parseRequestOptionsFromJSON: vi.fn((input) => input),
  // Additional exports that might be needed
  parsePublicKeyCredentialWithAssertionJSON: vi.fn((input) => input),
  parsePublicKeyCredentialWithAttestationJSON: vi.fn((input) => input),
}));

/**
 * Mock TextEncoder/TextDecoder if not available in test environment
 * Some Node.js versions may not have these globals
 */
if (typeof global.TextEncoder === "undefined") {
  const { TextEncoder, TextDecoder } = require("util");
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}
